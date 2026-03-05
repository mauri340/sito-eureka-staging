"""Lightweight mock of the chat backend for local testing."""
import http.server
import json
import uuid
import os
import mimetypes

PORT = 8000
ROOT = os.path.dirname(os.path.abspath(__file__))

PAGE_GREETINGS = {
    '': "Ciao! Sono Mentor Eureka. Posso aiutarti a scoprire il metodo di apprendimento rapido piu' efficace d'Italia?",
    'index': "Ciao! Sono Mentor Eureka. Posso aiutarti a scoprire il metodo di apprendimento rapido piu' efficace d'Italia?",
    'coaching': "Vedo che ti interessa la coaching 1:1 gratuita. Vuoi sapere come funziona la sessione?",
    'libro': "Stai guardando il nostro libro! Oltre 80.000 copie vendute. Posso aiutarti a capire se fa per te?",
    'metodo-eureka': "Vuoi capire meglio come funziona il Metodo Eureka? Sono qui per spiegarti tutto!",
    'master-eureka': "Il Master Eureka e' il nostro percorso completo. Vuoi sapere cosa include?",
    'testimonianze': "Stai leggendo le testimonianze. Vuoi sapere quale percorso e' piu' adatto a te?",
    'risorse-gratuite': "Stai esplorando le nostre risorse gratuite. Posso aiutarti a scegliere da dove iniziare!",
    'blog': "Benvenuto nel nostro blog! Posso suggerirti gli articoli piu' utili per il tuo obiettivo.",
    'demo-zoom': "Stai guardando il nostro webinar gratuito. Vuoi sapere cosa imparerai?",
}

DEFAULT_GREETING = "Ciao! Sono Mentor Eureka. Come posso aiutarti?"


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def do_POST(self):
        length = int(self.headers.get('Content-Length', 0))
        body = json.loads(self.rfile.read(length)) if length else {}

        if self.path == '/api/chat/session/start':
            self._handle_start(body)
        elif self.path == '/api/chat/message':
            self._handle_message(body)
        elif self.path == '/api/chat/session/end':
            self._handle_end(body)
        else:
            self.send_error(404)

    def do_GET(self):
        if self.path == '/api/chat/health':
            self._json_response({'status': 'ok'})
        else:
            super().do_GET()

    def _handle_start(self, body):
        ctx = body.get('page_context', {})
        url = ctx.get('url', '')
        section = ctx.get('section', '')

        raw = section or url.strip('/').split('/')[-1]
        key = raw.replace('.html', '')
        greeting = PAGE_GREETINGS.get(key)
        proactive = greeting is not None

        self._json_response({
            'session_id': uuid.uuid4().hex[:12],
            'speech': greeting or DEFAULT_GREETING,
            'proactive': proactive,
        })

    def _handle_message(self, body):
        msg = body.get('message', '').lower()
        session_id = body.get('session_id', '')

        if any(w in msg for w in ['webinar', 'zoom', 'diretta']):
            speech = "Il prossimo webinar gratuito e' in programma! Due ore in diretta dove vedrai il metodo applicato dal vivo. Vuoi prenotare il tuo posto?"
        elif any(w in msg for w in ['costo', 'prezzo', 'quanto costa', 'investimento']):
            speech = "Il percorso viene personalizzato in base alle tue esigenze. Ti consiglio di prenotare una coaching gratuita 1:1 dove analizziamo la tua situazione e ti diamo tutte le informazioni, senza impegno."
        elif any(w in msg for w in ['libro', 'book']):
            speech = "Il nostro libro ha venduto oltre 80.000 copie dal 2009. E' una guida pratica alle tecniche di apprendimento rapido. Lo trovi su Amazon!"
        elif any(w in msg for w in ['ciao', 'salve', 'buongiorno', 'buonasera']):
            speech = "Ciao! Piacere di conoscerti. Come posso aiutarti oggi? Posso parlarti del metodo, del webinar gratuito, o delle nostre risorse."
        elif any(w in msg for w in ['grazie', 'thanks']):
            speech = "Prego! Se hai altre domande, sono qui. In bocca al lupo per il tuo percorso di apprendimento!"
        else:
            speech = "Ottima domanda! Il Metodo Eureka ti insegna tecniche di memoria, lettura veloce e mappe mentali. Con soli 30 minuti al giorno puoi migliorare drasticamente. Vuoi saperne di piu'?"

        self._json_response({
            'session_id': session_id,
            'action': 'reply',
            'speech': speech,
            'display_text': speech,
            'state': {
                'stage': 'discovery',
                'flow_target': None,
                'collected_fields': {},
                'awaiting_confirmation': False,
                'action_executed': False,
            },
            'business_result': None,
            'audio_base64': None,
        })

    def _handle_end(self, body):
        self._json_response({'status': 'ok'})

    def _json_response(self, obj, code=200):
        data = json.dumps(obj).encode()
        self.send_response(code)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', len(data))
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(data)

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()


if __name__ == '__main__':
    print(f"Mock API + static server on http://localhost:{PORT}")
    with http.server.HTTPServer(('', PORT), Handler) as srv:
        srv.serve_forever()
