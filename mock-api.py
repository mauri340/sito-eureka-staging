"""Lightweight mock of the chat backend for local testing.

Automatically injects chat-widget.js into every HTML page served,
so no manual <script> tags are needed in any HTML file.
"""
import http.server
import json
import uuid
import os
import io
import mimetypes

PORT = 8000
ROOT = os.path.dirname(os.path.abspath(__file__))
WIDGET_SNIPPET = '<script src="/chat-widget.js" data-api=""></script>'

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

    # ── Routing ────────────────────────────────────────

    def do_POST(self):
        length = int(self.headers.get('Content-Length', 0))
        body = json.loads(self.rfile.read(length)) if length else {}

        if self.path == '/api/chat/session/start':
            self._handle_start(body)
        elif self.path == '/api/chat/message':
            self._handle_message(body)
        elif self.path == '/api/chat/submit-form':
            self._handle_submit_form(body)
        elif self.path == '/api/chat/session/end':
            self._handle_end(body)
        else:
            self.send_error(404)

    def do_GET(self):
        if self.path == '/api/chat/health':
            self._json_response({'status': 'ok'})
            return

        path = self.translate_path(self.path)

        if os.path.isdir(path):
            index = os.path.join(path, 'index.html')
            if os.path.isfile(index):
                path = index
            else:
                super().do_GET()
                return

        if path.endswith('.html') and os.path.isfile(path):
            self._serve_html_with_widget(path)
        else:
            super().do_GET()

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    # ── HTML injection ─────────────────────────────────

    def _serve_html_with_widget(self, filepath):
        """Read an HTML file, inject the chat widget, and serve it."""
        with open(filepath, 'r', encoding='utf-8') as f:
            html = f.read()

        import re
        html = re.sub(r'<script\s+src=["\'](?:\.?/?)chat-widget\.js["\'][^>]*>\s*</script>\s*', '', html)
        if '</body>' in html:
            html = html.replace('</body>', WIDGET_SNIPPET + '\n</body>')

        data = html.encode('utf-8')
        self.send_response(200)
        self.send_header('Content-Type', 'text/html; charset=utf-8')
        self.send_header('Content-Length', len(data))
        self.end_headers()
        self.wfile.write(data)

    # ── Chat API handlers ──────────────────────────────

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

    FORMS = {
        'webinar_registration': {
            'form_id': 'webinar_registration',
            'title': 'Iscrizione Webinar Gratuito',
            'fields': [
                {'name': 'nome', 'label': 'Nome', 'type': 'text', 'placeholder': 'Il tuo nome', 'required': True},
                {'name': 'cognome', 'label': 'Cognome', 'type': 'text', 'placeholder': 'Il tuo cognome', 'required': True},
                {'name': 'email', 'label': 'Email', 'type': 'email', 'placeholder': 'la.tua@email.it', 'required': True},
                {'name': 'telefono', 'label': 'Telefono', 'type': 'tel', 'placeholder': '+39 333 1234567', 'required': True},
            ],
            'privacy_checkbox': True,
            'privacy_text': 'Acconsento al trattamento dei dati personali ai sensi del GDPR.',
            'submit_label': 'Iscrivimi al Webinar',
        },
        'coaching_booking': {
            'form_id': 'coaching_booking',
            'title': 'Prenota Coaching 1:1 Gratuita',
            'fields': [
                {'name': 'nome', 'label': 'Nome', 'type': 'text', 'placeholder': 'Il tuo nome', 'required': True},
                {'name': 'cognome', 'label': 'Cognome', 'type': 'text', 'placeholder': 'Il tuo cognome', 'required': True},
                {'name': 'email', 'label': 'Email', 'type': 'email', 'placeholder': 'la.tua@email.it', 'required': True},
                {'name': 'telefono', 'label': 'Telefono', 'type': 'tel', 'placeholder': '+39 333 1234567', 'required': True},
            ],
            'privacy_checkbox': True,
            'privacy_text': 'Acconsento al trattamento dei dati personali ai sensi del GDPR.',
            'submit_label': 'Prenota la Coaching',
        },
        'lead_capture': {
            'form_id': 'lead_capture',
            'title': 'Richiedi Informazioni',
            'fields': [
                {'name': 'nome', 'label': 'Nome', 'type': 'text', 'placeholder': 'Il tuo nome', 'required': True},
                {'name': 'email', 'label': 'Email', 'type': 'email', 'placeholder': 'la.tua@email.it', 'required': True},
                {'name': 'telefono', 'label': 'Telefono (opzionale)', 'type': 'tel', 'placeholder': '+39 333 1234567', 'required': False},
            ],
            'privacy_checkbox': True,
            'privacy_text': 'Acconsento al trattamento dei dati personali ai sensi del GDPR.',
            'submit_label': 'Invia Richiesta',
        },
    }

    def _handle_message(self, body):
        msg = body.get('message', '').lower()
        session_id = body.get('session_id', '')

        if any(w in msg for w in ['iscri', 'registr', 'prenot']) and any(w in msg for w in ['webinar', 'zoom', 'diretta']):
            self._json_response({
                'session_id': session_id,
                'action': 'show_form',
                'speech': "Perfetto! Compila il modulo per iscriverti al prossimo webinar gratuito.",
                'display_text': "Perfetto! Compila il modulo per iscriverti al prossimo webinar gratuito.",
                'form': self.FORMS['webinar_registration'],
                'state': {'stage': 'data_collection', 'flow_target': 'webinar',
                          'collected_fields': {}, 'awaiting_confirmation': False, 'action_executed': False},
                'business_result': None, 'audio_base64': None,
            })
            return

        if any(w in msg for w in ['iscri', 'registr', 'prenot']) and any(w in msg for w in ['coaching', 'sessione', '1:1']):
            self._json_response({
                'session_id': session_id,
                'action': 'show_form',
                'speech': "Ottimo! Compila il modulo per prenotare la tua coaching gratuita.",
                'display_text': "Ottimo! Compila il modulo per prenotare la tua coaching gratuita.",
                'form': self.FORMS['coaching_booking'],
                'state': {'stage': 'data_collection', 'flow_target': 'coaching',
                          'collected_fields': {}, 'awaiting_confirmation': False, 'action_executed': False},
                'business_result': None, 'audio_base64': None,
            })
            return

        if any(w in msg for w in ['webinar', 'zoom', 'diretta']):
            speech = "Il prossimo webinar gratuito e' in programma! Due ore in diretta dove vedrai il metodo applicato dal vivo. Vuoi che ti iscrivo?"
        elif any(w in msg for w in ['coaching', 'sessione', '1:1']):
            speech = "La coaching 1:1 gratuita dura 30 minuti via Zoom. Analizziamo la tua situazione e ti diamo un piano personalizzato. Vuoi prenotare?"
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
            'state': {'stage': 'discovery', 'flow_target': None,
                      'collected_fields': {}, 'awaiting_confirmation': False, 'action_executed': False},
            'business_result': None, 'audio_base64': None,
        })

    def _handle_submit_form(self, body):
        session_id = body.get('session_id', '')
        form_id = body.get('form_id', '')
        data = body.get('data', {})
        privacy = body.get('privacy_accepted', False)

        if not privacy:
            self._json_response({'detail': 'Devi accettare il trattamento dei dati personali.'}, 400)
            return

        nome = data.get('nome', '').strip()
        email = data.get('email', '').strip()
        if not nome or not email:
            self._json_response({'detail': 'Nome e email sono obbligatori.'}, 422)
            return

        if form_id == 'webinar_registration':
            speech = f"Perfetto {nome}! Ti abbiamo iscritto al webinar gratuito. A breve riceverai un'email di conferma a {email}."
        elif form_id == 'coaching_booking':
            speech = f"Ottimo {nome}! La tua richiesta di coaching e' stata inviata. Ti contatteremo a {email} per confermare data e orario."
        else:
            speech = f"Grazie {nome}! Abbiamo ricevuto i tuoi dati. Ti contatteremo presto a {email}."

        self._json_response({
            'session_id': session_id,
            'action': 'action_completed',
            'speech': speech,
            'display_text': speech,
            'state': {'stage': 'completed', 'flow_target': form_id,
                      'collected_fields': data, 'awaiting_confirmation': False, 'action_executed': True},
            'business_result': {'success': True, 'action': form_id},
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


if __name__ == '__main__':
    print(f"Mock API + static server on http://localhost:{PORT}")
    print(f"Chat widget auto-injected into all HTML pages")
    with http.server.HTTPServer(('', PORT), Handler) as srv:
        srv.serve_forever()
