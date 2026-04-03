#!/usr/bin/env python3
"""Test script per verificare la funzionalità di prenotazione appuntamenti"""

import json
import requests
from datetime import datetime, timedelta

def test_booking_system():
    """Test della funzionalità di booking"""
    print("🔬 Test del sistema di prenotazione appuntamenti")
    print("=" * 50)
    
    # Test degli slot disponibili
    try:
        import sys
        sys.path.append('.')
        from mock_api import get_available_slots, book_appointment
        
        print("✅ Test 1: Verifica slot disponibili")
        slots = get_available_slots()
        if slots:
            print(f"   📅 Trovati {len(slots)} giorni con slot disponibili")
            for day in slots[:2]:  # Primi 2 giorni
                print(f"   📍 {day['weekday']} {day['date']}: {len(day['slots'])} slot")
        else:
            print("   ❌ ERRORE: Nessun slot disponibile trovato")
        
        print("\n✅ Test 2: Verifica prenotazione slot")
        if slots and slots[0]['slots']:
            first_slot = slots[0]
            date = first_slot['date']
            time = first_slot['slots'][0]
            
            success, message = book_appointment(
                date, time, 
                "Test User", 
                "test@example.com", 
                "+39 333 1234567"
            )
            
            if success:
                print(f"   ✅ Prenotazione riuscita: {message}")
                
                # Test doppia prenotazione (dovrebbe fallire)
                success2, message2 = book_appointment(
                    date, time, 
                    "Test User 2", 
                    "test2@example.com", 
                    "+39 333 7654321"
                )
                
                if not success2:
                    print(f"   ✅ Controllo doppia prenotazione OK: {message2}")
                else:
                    print(f"   ❌ ERRORE: Doppia prenotazione consentita!")
            else:
                print(f"   ❌ ERRORE: Prenotazione fallita: {message}")
        
        print("\n✅ Test 3: Verifica aggiornamento slot dopo prenotazione")
        updated_slots = get_available_slots()
        if updated_slots:
            first_updated = updated_slots[0]
            if len(first_updated['slots']) == len(first_slot['slots']) - 1:
                print("   ✅ Slot correttamente rimosso dopo prenotazione")
            else:
                print(f"   ❌ ERRORE: Slot non aggiornati. Prima: {len(first_slot['slots'])}, Dopo: {len(first_updated['slots'])}")
        
        print("\n🎉 Test completato!")
        return True
        
    except ImportError as e:
        print(f"❌ ERRORE: Impossibile importare mock_api: {e}")
        return False
    except Exception as e:
        print(f"❌ ERRORE: {e}")
        return False

if __name__ == '__main__':
    test_booking_system()