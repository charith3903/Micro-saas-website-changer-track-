// ============================================================
// SSRF Protection — block requests to private/internal IPs
// ============================================================

import { URL } from 'url';
import dns from 'dns/promises';

// Private/reserved IP ranges that must be blocked
const BLOCKED_RANGES = [
  // IPv4 private ranges
  { start: '10.0.0.0', end: '10.255.255.255' },
  { start: '172.16.0.0', end: '172.31.255.255' },
  { start: '192.168.0.0', end: '192.168.255.255' },
  // Loopback
  { start: '127.0.0.0', end: '127.255.255.255' },
  // Link-local
  { start: '169.254.0.0', end: '169.254.255.255' },
  // Cloud metadata
  { start: '169.254.169.254', end: '169.254.169.254' },
];

function ipToNumber(ip: string): number {
  const parts = ip.split('.').map(Number);
  return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
}

function isPrivateIPv4(ip: string): boolean {
  // Check for IPv4-mapped IPv6 addresses
  if (ip.startsWith('::ffff:')) {
    ip = ip.substring(7);
  }

  const num = ipToNumber(ip);
  return BLOCKED_RANGES.some(range => {
    const start = ipToNumber(range.start);
    const end = ipToNumber(range.end);
    return num >= start && num <= end;
  });
}

function isPrivateIPv6(ip: string): boolean {
  const lower = ip.toLowerCase();
  return (
    lower === '::1' ||                      // loopback
    lower.startsWith('fe80:') ||            // link-local
    lower.startsWith('fc') ||               // unique local
    lower.startsWith('fd') ||               // unique local
    lower === '::' ||                        // unspecified
    lower.startsWith('::ffff:')              // IPv4-mapped (checked separately)
  );
}

// ============================================================
// Validate a URL for safety before fetching
// ============================================================

export interface UrlValidationResult {
  valid: boolean;
  error?: string;
  resolvedIp?: string;
}

export function validateUrlFormat(urlString: string): UrlValidationResult {
  try {
    const url = new URL(urlString);

    // Only allow http and https
    if (!['http:', 'https:'].includes(url.protocol)) {
      return { valid: false, error: 'Only HTTP and HTTPS URLs are allowed' };
    }

    // Block URLs with username:password
    if (url.username || url.password) {
      return { valid: false, error: 'URLs with credentials are not allowed' };
    }

    // Block localhost hostnames
    const hostname = url.hostname.toLowerCase();
    if (
      hostname === 'localhost' ||
      hostname === '0.0.0.0' ||
      hostname.endsWith('.local') ||
      hostname.endsWith('.internal')
    ) {
      return { valid: false, error: 'Localhost and internal URLs are not allowed' };
    }

    // Quick check: if hostname is an IP literal, check it immediately
    if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname)) {
      if (isPrivateIPv4(hostname)) {
        return { valid: false, error: 'Private/internal IP addresses are not allowed' };
      }
    }

    return { valid: true };
  } catch {
    return { valid: false, error: 'Invalid URL format' };
  }
}

// ============================================================
// DNS resolution check — call at fetch time to prevent
// DNS rebinding attacks (host resolves to private IP)
// ============================================================

export async function validateUrlDns(urlString: string): Promise<UrlValidationResult> {
  // First check format
  const formatResult = validateUrlFormat(urlString);
  if (!formatResult.valid) return formatResult;

  const url = new URL(urlString);
  const hostname = url.hostname;

  // Skip DNS check for IP literals (already checked above)
  if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname)) {
    return { valid: true, resolvedIp: hostname };
  }

  try {
    // Resolve DNS using OS facilities
    const addresses = await dns.lookup(hostname, { all: true });
    
    for (const record of addresses) {
      if (record.family === 4 && isPrivateIPv4(record.address)) {
        return {
          valid: false,
          error: `DNS resolves to private IP (${record.address}). This may be a security risk.`,
          resolvedIp: record.address,
        };
      }
      if (record.family === 6 && isPrivateIPv6(record.address)) {
        return {
          valid: false,
          error: `DNS resolves to private IPv6 (${record.address}). This may be a security risk.`,
          resolvedIp: record.address,
        };
      }
    }

    return { valid: true, resolvedIp: addresses[0]?.address };
  } catch (err) {
    return { valid: false, error: 'Could not resolve hostname' };
  }
}
