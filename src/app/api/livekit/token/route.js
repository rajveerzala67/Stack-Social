import { NextResponse } from 'next/server';
import { AccessToken } from 'livekit-server-sdk';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const room = searchParams.get('room');
  const identity = searchParams.get('identity');
  const name = searchParams.get('name');

  if (!room || !identity) {
    return NextResponse.json({ error: 'Missing room or identity' }, { status: 400 });
  }

  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  const wsUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL;

  if (!apiKey || !apiSecret) {
    return NextResponse.json({
      token: "mock_token",
      isMock: true,
      reason: "LiveKit credentials not found in env"
    });
  }

  try {
    const at = new AccessToken(apiKey, apiSecret, {
      identity: identity,
      name: name || identity,
    });

    at.addGrant({
      roomJoin: true,
      room: room,
      canPublish: true,
      canSubscribe: true,
    });

    const token = await at.toJwt();

    return NextResponse.json({ token, isMock: false, serverUrl: wsUrl });
  } catch (error) {
    console.error("Error generating LiveKit token:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
