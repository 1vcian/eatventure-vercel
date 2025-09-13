import { kv } from '@vercel/kv';
import { getSession } from '../../lib/session';

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).end();
    
    const session = getSession(req);
    if (!session?.isLoggedIn) return res.status(401).json({ error: 'Not authenticated' });
    
    try {
        // 1. Estrai sia l'ID che lo username dalla sessione
        const { id: userId, username } = session.user;

        // 2. Prendi lo stato del gioco inviato dal frontend
        const gameState = req.body;

        // 3. (Opzionale ma consigliato) Recupera lo stato esistente per non sovrascrivere altri dati
        const existingState = await kv.get(`user-state:${userId}`) || {};

        // 4. Crea il nuovo oggetto da salvare, unendo i dati esistenti,
        //    quelli nuovi e assicurandoti che lo username sia presente.
        const stateToSave = {
            ...existingState, // Mantiene i vecchi dati (se ce ne sono)
            ...gameState,     // Aggiunge o aggiorna i dati del gioco
            username: username  // Aggiunge o aggiorna lo username
        };
        
        // 5. Salva l'oggetto completo
        await kv.set(`user-state:${userId}`, stateToSave);
        
        res.status(200).json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to save state' });
    }
}