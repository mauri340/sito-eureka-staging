/* Self-service gestione appuntamento — vanilla JS, niente librerie esterne. */
(function () {
    'use strict';

    var stage = document.getElementById('stage');
    var qs = new URLSearchParams(window.location.search);
    var token = qs.get('token') || '';
    var mockMode = qs.get('mock') || '';

    var BACKEND_URL = (function () {
        var meta = document.querySelector('meta[name="backend-url"]');
        return (meta && meta.getAttribute('content')) || 'https://ai-call-system-1.onrender.com';
    })();

    var SUPPORT_EMAIL = 'info@apprendimentorapido.it';

    var state = {
        appointment: null,
        slotsResponse: null,
        rescheduleFascia: 'tutti',
        rescheduleExtended: false,
        selectedSlotIso: null,
        loading: false,
    };

    // ===== util DOM (no innerHTML) =====
    function el(tag, attrs, children) {
        var node = document.createElement(tag);
        if (attrs) {
            Object.keys(attrs).forEach(function (k) {
                if (k === 'class') node.className = attrs[k];
                else if (k.indexOf('on') === 0 && typeof attrs[k] === 'function') {
                    node.addEventListener(k.substring(2), attrs[k]);
                } else if (k === 'disabled') {
                    if (attrs[k]) node.setAttribute('disabled', 'disabled');
                } else {
                    node.setAttribute(k, attrs[k]);
                }
            });
        }
        if (children) {
            (Array.isArray(children) ? children : [children]).forEach(function (c) {
                if (c == null) return;
                if (typeof c === 'string') node.appendChild(document.createTextNode(c));
                else node.appendChild(c);
            });
        }
        return node;
    }

    function clearStage() { while (stage.firstChild) stage.removeChild(stage.firstChild); }

    function renderError(title, message, opts) {
        clearStage();
        var box = el('div', { class: 'result error' });
        box.appendChild(el('h2', null, title));
        box.appendChild(el('p', null, message));
        if (!(opts && opts.hideContact)) {
            box.appendChild(el('p', null, 'Per assistenza scrivi a ' + SUPPORT_EMAIL + '.'));
        }
        var back = el('a', { class: 'btn btn-secondary', href: 'https://apprendimentorapido.it' }, 'Torna al sito');
        box.appendChild(back);
        stage.appendChild(box);
    }

    function renderResult(title, message) {
        clearStage();
        var box = el('div', { class: 'result success' });
        box.appendChild(el('h2', null, title));
        box.appendChild(el('p', null, message));
        var back = el('a', { class: 'btn btn-primary', href: 'https://apprendimentorapido.it' }, 'Torna al sito');
        box.appendChild(back);
        stage.appendChild(box);
    }

    function setLoading(flag) {
        state.loading = flag;
        var btns = stage.querySelectorAll('button[data-loading-target="true"]');
        for (var i = 0; i < btns.length; i++) {
            if (flag) btns[i].setAttribute('disabled', 'disabled');
            else btns[i].removeAttribute('disabled');
        }
    }

    // ===== fetch wrapper =====
    function api(path, options) {
        options = options || {};
        var url = BACKEND_URL + path;
        return fetch(url, {
            method: options.method || 'GET',
            headers: { 'Content-Type': 'application/json' },
            body: options.body ? JSON.stringify(options.body) : undefined,
        }).then(function (r) {
            return r.json().then(function (j) {
                return { status: r.status, body: j };
            }, function () {
                return { status: r.status, body: null };
            });
        });
    }

    function errorMessageFor(status, body) {
        var detail = body && body.detail;
        var code = (detail && detail.error) || (body && body.error) || '';
        switch (code) {
            case 'token_expired':
                return ['Link scaduto', 'Il link che hai usato è scaduto. Per modifiche scrivi a ' + SUPPORT_EMAIL + '.'];
            case 'token_invalid_signature':
            case 'token_malformed':
                return ['Link non valido', 'Il link non è valido. Controlla di averlo copiato per intero.'];
            case 'appointment_not_found':
                return ['Appuntamento non trovato', 'Non riusciamo a trovare l\'appuntamento associato a questo link.'];
            case 'appointment_already_cancelled':
            case 'already_cancelled':
                return ['Già cancellato', 'Questo appuntamento risulta già cancellato.'];
            case 'cancel_cutoff_passed':
                return ['Modifiche non più disponibili', 'A meno di 12 ore dall\'appuntamento non è più possibile cancellare. Scrivi a ' + SUPPORT_EMAIL + '.'];
            case 'reschedule_cutoff_passed':
                return ['Riprogrammazione non più disponibile', 'A meno di 24 ore dall\'appuntamento non è più possibile riprogrammare. Scrivi a ' + SUPPORT_EMAIL + '.'];
            case 'max_reschedule_reached':
                return ['Limite riprogrammazioni raggiunto', 'Hai già riprogrammato 2 volte. Per ulteriori cambi scrivi a ' + SUPPORT_EMAIL + '.'];
            case 'invalid_reason':
                return ['Motivo non valido', 'Il motivo selezionato non è valido. Riprova.'];
            case 'slot_no_longer_available':
            case 'new_start_iso_invalid':
                return ['Orario non più disponibile', 'L\'orario selezionato non è più disponibile. Ricarica la pagina e riprova.'];
            case 'weekend_not_allowed':
                return ['Giorno non disponibile', 'Sabato e domenica non sono disponibili.'];
            case 'rate_limit_exceeded':
                return ['Troppe richieste', 'Hai fatto troppe richieste in poco tempo. Riprova tra qualche minuto.'];
            default:
                if (status === 503) return ['Servizio momentaneamente non disponibile', 'Riprova fra qualche minuto.'];
                return ['Si è verificato un errore', 'Riprova fra poco oppure scrivi a ' + SUPPORT_EMAIL + '.'];
        }
    }

    // ===== state renders =====
    function renderAppointmentView() {
        clearStage();
        var a = state.appointment;
        var card = el('div', { class: 'appointment-card' }, [
            el('div', { class: 'label' }, 'Il tuo appuntamento'),
            el('div', { class: 'when' }, a.data_ora_label || ''),
            el('div', { class: 'meta' }, a.coach_name ? ['Con ', el('strong', null, a.coach_name)] : ''),
            el('div', { class: 'reschedule-counter' }, 'Riprogrammazioni: ' + (a.reschedule_count || 0) + '/' + (a.max_reschedule || 2)),
        ]);

        var actions = el('div', { class: 'actions' });

        var cancelBtn = el('button', {
            class: 'btn btn-secondary',
            'data-loading-target': 'true',
            onclick: function () {
                if (!a.can_cancel) return;
                renderCancelFlow();
            },
        }, 'Annulla appuntamento');
        if (!a.can_cancel) cancelBtn.setAttribute('disabled', 'disabled');

        var reschedBtn = el('button', {
            class: 'btn btn-primary',
            'data-loading-target': 'true',
            onclick: function () {
                if (!a.can_reschedule) return;
                loadSlotsAndRenderReschedule();
            },
        }, 'Riprogramma');
        if (!a.can_reschedule) reschedBtn.setAttribute('disabled', 'disabled');

        actions.appendChild(cancelBtn);
        actions.appendChild(reschedBtn);

        stage.appendChild(el('h2', { class: 'heading' }, 'Ciao' + (a.nome ? ' ' + a.nome : '') + ','));
        stage.appendChild(el('p', { class: 'subheading' }, 'da qui puoi annullare o riprogrammare il tuo appuntamento.'));
        stage.appendChild(card);
        stage.appendChild(actions);

        if (!a.can_cancel || !a.can_reschedule) {
            var msg = '';
            if (!a.can_cancel && a.cancel_blocked_reason === 'cancel_cutoff_passed') {
                msg = 'A meno di 12 ore dall\'appuntamento non è più possibile cancellare.';
            } else if (!a.can_reschedule && a.reschedule_blocked_reason === 'reschedule_cutoff_passed') {
                msg = 'A meno di 24 ore non è più possibile riprogrammare.';
            } else if (!a.can_reschedule && a.reschedule_blocked_reason === 'max_reschedule_reached') {
                msg = 'Hai raggiunto il numero massimo di riprogrammazioni (2). Per ulteriori cambi scrivi a ' + SUPPORT_EMAIL + '.';
            }
            if (msg) stage.appendChild(el('div', { class: 'notice' }, msg));
        }
    }

    function renderCancelFlow() {
        clearStage();
        var a = state.appointment;
        stage.appendChild(el('h2', { class: 'heading' }, 'Vuoi annullare?'));
        stage.appendChild(el('p', { class: 'subheading' }, 'Stai per annullare l\'appuntamento del ' + (a.data_ora_label || '') + '.'));

        var form = el('div', { class: 'cancel-form' });
        form.appendChild(el('label', { for: 'reason' }, 'Motivo (facoltativo)'));
        var select = el('select', { id: 'reason' }, [
            el('option', { value: '' }, '— Nessun motivo —'),
            el('option', { value: 'Imprevisto / impossibilità' }, 'Imprevisto / impossibilità'),
            el('option', { value: 'Cambio idea' }, 'Cambio idea'),
            el('option', { value: 'Altro' }, 'Altro'),
        ]);
        form.appendChild(select);

        var actions = el('div', { class: 'actions' });
        var back = el('button', {
            class: 'btn btn-link',
            'data-loading-target': 'true',
            onclick: function () { renderAppointmentView(); },
        }, 'Indietro');
        var confirm = el('button', {
            class: 'btn btn-primary',
            'data-loading-target': 'true',
            onclick: function () {
                if (!window.confirm('Sei sicuro di voler annullare l\'appuntamento?')) return;
                doCancel(select.value || null);
            },
        }, 'Conferma annullamento');
        actions.appendChild(back);
        actions.appendChild(confirm);

        stage.appendChild(form);
        stage.appendChild(actions);
    }

    function doCancel(reason) {
        setLoading(true);
        api('/api/public/appointment/' + encodeURIComponent(token) + '/cancel', {
            method: 'POST',
            body: { reason: reason },
        }).then(function (resp) {
            setLoading(false);
            if (resp.status === 200) {
                renderResult('Appuntamento annullato', 'Ti abbiamo inviato una email di conferma.');
                return;
            }
            var info = errorMessageFor(resp.status, resp.body);
            renderError(info[0], info[1]);
        });
    }

    function loadSlotsAndRenderReschedule() {
        setLoading(true);
        var url = '/api/public/appointment/' + encodeURIComponent(token) + '/slots'
                + '?fascia=' + encodeURIComponent(state.rescheduleFascia)
                + '&extend=' + (state.rescheduleExtended ? 'true' : 'false');
        api(url).then(function (resp) {
            setLoading(false);
            if (resp.status === 200) {
                state.slotsResponse = resp.body;
                renderRescheduleFlow();
                return;
            }
            var info = errorMessageFor(resp.status, resp.body);
            renderError(info[0], info[1]);
        });
    }

    function renderRescheduleFlow() {
        clearStage();
        stage.appendChild(el('h2', { class: 'heading' }, 'Scegli un nuovo orario'));
        stage.appendChild(el('p', { class: 'subheading' }, 'Sabato e domenica esclusi. Mattina = entro le 13:00, pomeriggio = dopo.'));

        var filter = el('div', { class: 'filter-toggle' });
        ['tutti', 'mattina', 'pomeriggio'].forEach(function (opt) {
            var btn = el('button', {
                type: 'button',
                'aria-pressed': state.rescheduleFascia === opt ? 'true' : 'false',
                onclick: function () {
                    state.rescheduleFascia = opt;
                    state.selectedSlotIso = null;
                    loadSlotsAndRenderReschedule();
                },
            }, opt === 'tutti' ? 'Tutto' : (opt.charAt(0).toUpperCase() + opt.slice(1)));
            filter.appendChild(btn);
        });
        stage.appendChild(filter);

        var slots = (state.slotsResponse && state.slotsResponse.slots_by_day) || [];
        if (slots.length === 0) {
            stage.appendChild(el('div', { class: 'notice' }, 'Nessuno slot disponibile in questa finestra. Prova ad estendere oppure scrivi a ' + SUPPORT_EMAIL + '.'));
        } else {
            slots.forEach(function (day) {
                var grp = el('div', { class: 'day-group' });
                grp.appendChild(el('h3', null, day.date_label || day.date_iso));
                var list = el('div', { class: 'slot-list' });
                day.slots.forEach(function (slot) {
                    var inputId = 'slot-' + slot.start_iso.replace(/[^a-z0-9]/gi, '');
                    var radio = el('input', {
                        type: 'radio',
                        name: 'slot',
                        id: inputId,
                        value: slot.start_iso,
                        onchange: function () { state.selectedSlotIso = slot.start_iso; },
                    });
                    if (state.selectedSlotIso === slot.start_iso) radio.setAttribute('checked', 'checked');
                    var lbl = el('label', { for: inputId }, slot.label || slot.start_iso);
                    var wrap = el('div', { class: 'slot-radio' }, [radio, lbl]);
                    list.appendChild(wrap);
                });
                grp.appendChild(list);
                stage.appendChild(grp);
            });
        }

        if (state.slotsResponse && state.slotsResponse.has_more && !state.rescheduleExtended) {
            var moreBtn = el('button', {
                class: 'btn btn-link',
                onclick: function () {
                    state.rescheduleExtended = true;
                    loadSlotsAndRenderReschedule();
                },
            }, 'Mostra altri 7 giorni');
            stage.appendChild(moreBtn);
        }

        var actions = el('div', { class: 'actions mt-20' });
        var back = el('button', {
            class: 'btn btn-link',
            'data-loading-target': 'true',
            onclick: function () { renderAppointmentView(); },
        }, 'Indietro');
        var confirm = el('button', {
            class: 'btn btn-primary',
            'data-loading-target': 'true',
            onclick: function () {
                if (!state.selectedSlotIso) {
                    window.alert('Seleziona prima un orario.');
                    return;
                }
                doReschedule(state.selectedSlotIso);
            },
        }, 'Conferma riprogrammazione');
        actions.appendChild(back);
        actions.appendChild(confirm);
        stage.appendChild(actions);
    }

    function doReschedule(newStartIso) {
        setLoading(true);
        api('/api/public/appointment/' + encodeURIComponent(token) + '/reschedule', {
            method: 'POST',
            body: { new_start_iso: newStartIso },
        }).then(function (resp) {
            setLoading(false);
            if (resp.status === 200) {
                renderResult(
                    'Appuntamento riprogrammato',
                    'Nuovo orario: ' + (resp.body.new_data_ora_label || newStartIso) + '. Ti abbiamo inviato una email di conferma.'
                );
                return;
            }
            var info = errorMessageFor(resp.status, resp.body);
            renderError(info[0], info[1]);
        });
    }

    // ===== Mock data per dev/preview =====
    var MOCKS = {
        appointment: {
            appuntamento_id: 'apt-mock',
            contatto_id: 'cnt-mock',
            nome: 'Marco', cognome: 'Rossi',
            email: 'marco.rossi@example.com',
            stato: 'confermato',
            data_ora_iso: '2026-05-15T10:00:00+02:00',
            data_ora_label: 'giovedì 15 maggio 2026 alle 10:00',
            durata_minuti: 60,
            zoom_join_url: 'https://zoom.us/j/123',
            coach_name: 'Maurizio',
            titolo: 'Coaching gratuito',
            reschedule_count: 0,
            max_reschedule: 2,
            can_cancel: true,
            can_reschedule: true,
            cancel_blocked_reason: null,
            reschedule_blocked_reason: null,
            cancellation_reasons: ['Imprevisto / impossibilità', 'Cambio idea', 'Altro'],
        },
        cutoff_error: { status: 403, body: { detail: { error: 'cancel_cutoff_passed' } } },
        max_reschedule: { status: 403, body: { detail: { error: 'max_reschedule_reached' } } },
        success: 'success',
    };

    // ===== Bootstrap =====
    function start() {
        if (mockMode === 'appointment') {
            state.appointment = MOCKS.appointment;
            renderAppointmentView();
            return;
        }
        if (mockMode === 'cutoff_error') {
            var info = errorMessageFor(403, MOCKS.cutoff_error.body);
            renderError(info[0], info[1]);
            return;
        }
        if (mockMode === 'max_reschedule') {
            var info2 = errorMessageFor(403, MOCKS.max_reschedule.body);
            renderError(info2[0], info2[1]);
            return;
        }
        if (mockMode === 'success') {
            renderResult('Appuntamento annullato', 'Ti abbiamo inviato una email di conferma.');
            return;
        }

        if (!token) {
            renderError('Link non valido', 'Manca il token nel link.');
            return;
        }

        api('/api/public/appointment/' + encodeURIComponent(token)).then(function (resp) {
            if (resp.status === 200) {
                state.appointment = resp.body;
                renderAppointmentView();
                return;
            }
            var info = errorMessageFor(resp.status, resp.body);
            renderError(info[0], info[1]);
        });
    }

    start();
})();
