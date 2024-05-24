# KartAI-Backend



Dies ist das Backend des KartAI-Projekts. Es handelt sich um eine Plattform für das Lernen mit verteilten Wiederholungen, die KI verwendet, um qualitativ hochwertige Lernmaterialien zu erzeugen. Dieses Backend ist für die Verwaltung der Benutzerdaten verantwortlich und kann als eine REST-API aufgerufen werden.



## Installation



Um das Backend zu installieren, folge diesen Schritten:



1. Klone das Repository:

```bash
git clone https://github.com/henriSchulz/kartai-backend.git
```



2. Wechsle in das Verzeichnis des geklonten Repositorys:

```bash
cd kartai-backend
```



3. Installiere die Abhängigkeiten:

```bash
npm install
```



4. Füge deine Firebase-Zugangsdaten zu `src/keys/credentials.json` hinzu.



5. Für production: Füge dein SSL-Zertifikat and Private-Key zu `src/keys/cert.pem` und `src/keys/key.pem` hinzu.



6. Starte das Backend:

```bash
npm start
```



## Lizenz



Dieses Projekt ist unter der MIT-Lizenz lizenziert.