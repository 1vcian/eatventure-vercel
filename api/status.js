import { parse } from 'cookie';

export default function handler(req, res) {
  if (!req.headers.cookie) {
    return res.json({ isLoggedIn: false });
  }

  const cookies = parse(req.headers.cookie);
  const session = cookies.user_session;

  if (!session) {
    return res.json({ isLoggedIn: false });
  }

  try {
    const sessionData = JSON.parse(session);
    res.status(200).json(sessionData);
  } catch (error) {
    res.status(200).json({ isLoggedIn: false });
  }
}