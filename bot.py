#!/usr/bin/env python3
"""
HelloMcDo Auto-Filler Bot
Remplit automatiquement les questionnaires McDonald's Medallia
"""

import random
import time
from datetime import datetime, timedelta
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options
from selenium.common.exceptions import TimeoutException, NoSuchElementException

# ============== CONFIGURATION ==============
CONFIG = {
    'url': 'https://survey2.medallia.eu/?feedless-hellomcdo',
    'restaurant_num': '0610',
    'date_start': (datetime.now() - timedelta(days=3)).strftime('%Y-%m-%d'),
    'date_end': datetime.now().strftime('%Y-%m-%d'),
    'hour_start': '08:00',
    'hour_end': '22:00',
    'order_mode': 'random',  # 'random' ou 1-8
    'comment': 'Tres bonne experience, personnel agreable et service rapide.',
    'nb_surveys': 1,
    'delay_between': 5,  # secondes entre chaque questionnaire
}

# Distribution des ages (en %)
AGE_DISTRIBUTION = {
    1: 0,    # Moins de 15 ans
    2: 10,   # 15-24 ans
    3: 30,   # 25-34 ans
    4: 20,   # 35-49 ans
    5: 40,   # 50+ ans
}


class HelloMcDoBot:
    def __init__(self, config):
        self.config = config
        self.driver = None

    def start_browser(self):
        """Demarre le navigateur Chrome"""
        options = Options()
        options.add_argument('--start-maximized')
        options.add_argument('--disable-blink-features=AutomationControlled')
        options.add_experimental_option('excludeSwitches', ['enable-automation'])

        self.driver = webdriver.Chrome(options=options)
        self.wait = WebDriverWait(self.driver, 10)
        print("Navigateur demarre")

    def close_browser(self):
        """Ferme le navigateur"""
        if self.driver:
            self.driver.quit()
            print("Navigateur ferme")

    def random_age(self):
        """Retourne un index d'age selon la distribution"""
        rand = random.randint(1, 100)
        cumul = 0
        for age_idx, percent in AGE_DISTRIBUTION.items():
            cumul += percent
            if rand <= cumul:
                return age_idx
        return 5  # Par defaut 50+

    def random_date(self):
        """Retourne une date aleatoire dans la plage"""
        start = datetime.strptime(self.config['date_start'], '%Y-%m-%d')
        end = datetime.strptime(self.config['date_end'], '%Y-%m-%d')
        delta = (end - start).days
        random_days = random.randint(0, max(0, delta))
        return start + timedelta(days=random_days)

    def random_hour(self, date):
        """Retourne une heure aleatoire dans la plage"""
        start_h, start_m = map(int, self.config['hour_start'].split(':'))
        end_h, end_m = map(int, self.config['hour_end'].split(':'))

        # Si c'est aujourd'hui, limiter a heure actuelle - 1
        if date.date() == datetime.now().date():
            current_h = datetime.now().hour - 1
            if current_h < end_h:
                end_h = current_h

        start_minutes = start_h * 60 + start_m
        end_minutes = end_h * 60 + end_m

        if end_minutes <= start_minutes:
            end_minutes = start_minutes + 60

        random_minutes = random.randint(start_minutes, end_minutes)
        h = random_minutes // 60
        m = random_minutes % 60

        return f"{h:02d}", f"{m:02d}"

    def click_element(self, element):
        """Clique sur un element de maniere fiable"""
        try:
            self.driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", element)
            time.sleep(0.2)
            element.click()
            return True
        except:
            try:
                self.driver.execute_script("arguments[0].click();", element)
                return True
            except:
                return False

    def find_and_click_radio(self, index):
        """Trouve et clique sur le radio button a l'index donne"""
        try:
            radios = self.driver.find_elements(By.CSS_SELECTOR, 'input[type="radio"]')
            if radios and index < len(radios):
                self.click_element(radios[index])
                return True
        except:
            pass
        return False

    def find_and_click_radio_random(self):
        """Clique sur un radio button aleatoire"""
        try:
            radios = self.driver.find_elements(By.CSS_SELECTOR, 'input[type="radio"]')
            if radios:
                idx = random.randint(0, len(radios) - 1)
                self.click_element(radios[idx])
                print(f"  Selection aleatoire: option {idx + 1}")
                return True
        except:
            pass
        return False

    def click_next(self):
        """Clique sur le bouton Suivant"""
        try:
            buttons = self.driver.find_elements(By.TAG_NAME, 'button')
            for btn in buttons:
                text = btn.text.lower()
                if 'suivant' in text or 'next' in text:
                    self.click_element(btn)
                    print("  -> Suivant")
                    return True
        except:
            pass
        return False

    def detect_page(self):
        """Detecte le type de page actuel"""
        try:
            text = self.driver.find_element(By.TAG_NAME, 'body').text.lower()

            if 'quel est votre âge' in text or 'quel est votre age' in text:
                return 'age'
            if 'jour' in text and 'heure' in text and 'restaurant' in text:
                return 'datetime'
            if 'borne de commande' in text or ('comptoir' in text and 'drive' in text):
                return 'ordermode'
            if 'consommé sur place' in text or 'pris à emporter' in text:
                return 'place'
            if 'où avez-vous récupéré' in text:
                return 'pickup'
            if 'service de livraison' in text:
                return 'delivery'
            if 'dans quelle mesure' in text and 'satisfait' in text:
                return 'satisfaction'
            if 'commande était exacte' in text:
                return 'exact'
            if 'problème durant' in text:
                return 'problem'
            if 'domaine' in text and 'améliorée' in text:
                return 'improve'
            if 'merci' in text and 'participation' in text:
                return 'complete'

        except:
            pass
        return 'unknown'

    def fill_age(self):
        """Remplit la question sur l'age"""
        age_idx = self.random_age()
        if self.find_and_click_radio(age_idx - 1):  # -1 car index commence a 0
            print(f"  Age: option {age_idx}")
            return True
        return False

    def fill_datetime(self):
        """Remplit la date, heure et numero de restaurant"""
        date = self.random_date()
        hour, minute = self.random_hour(date)

        try:
            inputs = self.driver.find_elements(By.TAG_NAME, 'input')

            for inp in inputs:
                try:
                    inp_type = inp.get_attribute('type') or ''
                    placeholder = (inp.get_attribute('placeholder') or '').lower()

                    # Date
                    if inp_type == 'date' or 'jj' in placeholder:
                        inp.clear()
                        inp.send_keys(date.strftime('%d/%m/%Y'))

                    # Chercher le contexte du label
                    parent_text = ''
                    try:
                        parent = inp.find_element(By.XPATH, './..')
                        parent_text = parent.text.lower()
                    except:
                        pass

                    if 'heure' in parent_text or 'heure' in placeholder:
                        inp.clear()
                        inp.send_keys(hour)

                    if 'minute' in parent_text or 'minute' in placeholder:
                        inp.clear()
                        inp.send_keys(minute)

                    if 'restaurant' in parent_text or 'numéro' in parent_text:
                        inp.clear()
                        inp.send_keys(self.config['restaurant_num'])

                except:
                    continue

            print(f"  Date: {date.strftime('%d/%m/%Y')} {hour}:{minute}, Restaurant: {self.config['restaurant_num']}")
            return True

        except Exception as e:
            print(f"  Erreur datetime: {e}")
            return False

    def fill_ordermode(self):
        """Remplit le mode de commande"""
        mode = self.config['order_mode']

        if mode == 'random':
            return self.find_and_click_radio_random()
        else:
            idx = int(mode) - 1
            if self.find_and_click_radio(idx):
                print(f"  Mode commande: option {mode}")
                return True
        return False

    def fill_satisfaction(self):
        """Remplit la satisfaction (meilleur smiley) et le commentaire"""
        try:
            # Chercher les smileys/echelles
            clickables = self.driver.find_elements(By.CSS_SELECTOR, '[role="radio"], button, [class*="scale"] div')
            if clickables:
                self.click_element(clickables[0])  # Premier = meilleur
                print("  Satisfaction: meilleur (smiley vert)")

            # Remplir le commentaire
            textareas = self.driver.find_elements(By.TAG_NAME, 'textarea')
            for ta in textareas:
                if self.config['comment']:
                    ta.clear()
                    ta.send_keys(self.config['comment'])
                    print("  Commentaire ajoute")

            return True
        except:
            return False

    def fill_best_yes(self):
        """Selectionne Oui (commande exacte)"""
        try:
            radios = self.driver.find_elements(By.CSS_SELECTOR, 'input[type="radio"]')
            for radio in radios:
                try:
                    parent = radio.find_element(By.XPATH, './..')
                    if 'oui' in parent.text.lower():
                        self.click_element(radio)
                        print("  Reponse: Oui")
                        return True
                except:
                    continue
            # Fallback: premier radio
            if radios:
                self.click_element(radios[0])
                return True
        except:
            pass
        return False

    def fill_best_no(self):
        """Selectionne Non (probleme)"""
        try:
            radios = self.driver.find_elements(By.CSS_SELECTOR, 'input[type="radio"]')
            for radio in radios:
                try:
                    parent = radio.find_element(By.XPATH, './..')
                    if 'non' in parent.text.lower():
                        self.click_element(radio)
                        print("  Reponse: Non")
                        return True
                except:
                    continue
            # Fallback: dernier radio (souvent Non)
            if radios:
                self.click_element(radios[-1])
                return True
        except:
            pass
        return False

    def fill_improve(self):
        """Selectionne 'Aucune de ces reponses'"""
        try:
            checkboxes = self.driver.find_elements(By.CSS_SELECTOR, 'input[type="checkbox"]')
            for cb in checkboxes:
                try:
                    parent = cb.find_element(By.XPATH, './..')
                    if 'aucune' in parent.text.lower():
                        self.click_element(cb)
                        print("  Amelioration: Aucune")
                        return True
                except:
                    continue
            # Fallback: dernier checkbox
            if checkboxes:
                self.click_element(checkboxes[-1])
                return True
        except:
            pass
        return False

    def fill_survey(self):
        """Remplit un questionnaire complet"""
        self.driver.get(self.config['url'])
        time.sleep(2)

        attempts = 0
        max_attempts = 30

        while attempts < max_attempts:
            attempts += 1
            time.sleep(1)

            page = self.detect_page()
            print(f"Page {attempts}: {page}")

            if page == 'complete':
                print("=== Questionnaire termine! ===")
                return True

            if page == 'age':
                self.fill_age()
            elif page == 'datetime':
                self.fill_datetime()
            elif page == 'ordermode':
                self.fill_ordermode()
            elif page in ['place', 'pickup', 'delivery']:
                self.find_and_click_radio_random()
            elif page == 'satisfaction':
                self.fill_satisfaction()
            elif page == 'exact':
                self.fill_best_yes()
            elif page == 'problem':
                self.fill_best_no()
            elif page == 'improve':
                self.fill_improve()
            else:
                # Page inconnue: essayer radio ou checkbox
                radios = self.driver.find_elements(By.CSS_SELECTOR, 'input[type="radio"]')
                checkboxes = self.driver.find_elements(By.CSS_SELECTOR, 'input[type="checkbox"]')
                if radios:
                    self.find_and_click_radio_random()
                elif checkboxes:
                    self.fill_improve()

            time.sleep(0.5)
            self.click_next()
            time.sleep(1.5)

        return False

    def run(self, nb_surveys=None):
        """Lance le bot pour remplir plusieurs questionnaires"""
        if nb_surveys is None:
            nb_surveys = self.config['nb_surveys']

        print(f"\n{'='*50}")
        print(f"HelloMcDo Bot - {nb_surveys} questionnaire(s) a remplir")
        print(f"{'='*50}\n")

        self.start_browser()

        try:
            for i in range(nb_surveys):
                print(f"\n--- Questionnaire {i + 1}/{nb_surveys} ---")
                success = self.fill_survey()

                if success:
                    print(f"Questionnaire {i + 1} complete!")
                else:
                    print(f"Questionnaire {i + 1} echoue")

                if i < nb_surveys - 1:
                    print(f"Attente {self.config['delay_between']} secondes...")
                    time.sleep(self.config['delay_between'])

        finally:
            input("\nAppuie sur Entree pour fermer le navigateur...")
            self.close_browser()

        print("\n=== Bot termine ===")


def main():
    """Point d'entree principal"""
    print("\n" + "="*50)
    print("  HELLOMCDO AUTO-FILLER BOT")
    print("="*50)

    # Demander le nombre de questionnaires
    try:
        nb = input(f"\nNombre de questionnaires [{CONFIG['nb_surveys']}]: ").strip()
        if nb:
            CONFIG['nb_surveys'] = int(nb)
    except:
        pass

    # Demander le numero de restaurant
    resto = input(f"Numero restaurant [{CONFIG['restaurant_num']}]: ").strip()
    if resto:
        CONFIG['restaurant_num'] = resto

    bot = HelloMcDoBot(CONFIG)
    bot.run()


if __name__ == '__main__':
    main()
