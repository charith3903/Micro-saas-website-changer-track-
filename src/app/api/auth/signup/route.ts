import { NextResponse } from 'next/server';
import { hashPassword, createToken, setAuthCookie, validateEmail, validatePassword } from '@/lib/auth';
import { query, queryOne } from '@/lib/db';
import { getIntervalForPlan } from '@/lib/plans';
import type { User } from '@/lib/types';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    if (!validateEmail(email)) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      );
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      return NextResponse.json(
        { error: passwordError },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existing = await queryOne<User>(
      'SELECT id FROM users WHERE email = $1',
      [email.toLowerCase().trim()]
    );

    if (existing) {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 409 }
      );
    }

    // Create user
    const password_hash = await hashPassword(password);
    const result = await queryOne<User>(
      `INSERT INTO users (email, password_hash, plan)
       VALUES ($1, $2, 'free')
       RETURNING id, email, plan, timezone, created_at`,
      [email.toLowerCase().trim(), password_hash]
    );

    if (!result) {
      throw new Error('Failed to create user');
    }

    // Create JWT and set cookie
    const token = createToken(result.id, result.email);
    await setAuthCookie(token);

    return NextResponse.json({
      user: {
        id: result.id,
        email: result.email,
        plan: result.plan,
        timezone: result.timezone,
      },
    }, { status: 201 });

  } catch (error) {
    console.error('[Auth] Signup error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
