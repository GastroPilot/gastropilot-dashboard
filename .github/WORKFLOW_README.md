# 🚀 CI/CD Setup - Frontend

Dieses Verzeichnis enthält GitHub Actions Workflows für automatisches Deployment des Frontends in verschiedene Umgebungen.

## 📋 Übersicht

Die Workflows deployen automatisch bei Push auf die entsprechenden Branches:

- **Production**: `main` oder `master` → Port 3001
- **Staging**: `staging` → Port 3002
- **Demo**: `demo` → Port 3003
- **Test**: `test` → Port 3004

## 🔧 Konfiguration

### 1. GitHub Secrets und Environments einrichten

#### Repository Secrets (einmalig für alle Environments)

Gehe zu deinem GitHub Repository → Settings → Secrets and variables → Actions

Füge folgende Repository Secrets hinzu (diese gelten für alle Environments):

```
SSH_PRIVATE_KEY                 # SSH Private Key für Server
SSH_HOST                        # Server-Hostname oder IP (z.B. example.com)
SSH_USER                        # SSH Benutzername (z.B. deploy)
SLACK_WEBHOOK_URL               # Slack Webhook URL für Benachrichtigungen (optional)
```

#### Environment Secrets (pro Environment unterschiedlich)

Gehe zu deinem GitHub Repository → Settings → Environments

Erstelle für jede Umgebung ein Environment:

- `production`
- `staging`
- `demo`
- `test`

Für jedes Environment füge folgende Secrets hinzu:

```
FRONTEND_ENV                    # Komplette .env-Datei für das Frontend (NEXT_PUBLIC_* Variablen)
DEPLOY_PATH                     # Deployment-Pfad (optional, Standard: /opt/gastropilot/frontend/{environment})
HEALTH_URL                      # Health Check URL (optional, Standard: http://localhost:{port})
```

**Wichtig**:

- SSH-Secrets (`SSH_PRIVATE_KEY`, `SSH_HOST`, `SSH_USER`) sind Repository-Secrets und gelten für alle Environments
- Environment-spezifische Secrets (`FRONTEND_ENV`, `DEPLOY_PATH`, `HEALTH_URL`) werden automatisch aus dem Environment-Kontext geladen
- Du musst die Environment-Secrets in jedem Environment separat konfigurieren, nicht mit Environment-Präfixen wie `FRONTEND_ENV_PRODUCTION`

### 2. Slack Webhook einrichten (optional)

Um Benachrichtigungen in Slack zu erhalten, erstelle einen Incoming Webhook:

1. Gehe zu deinem Slack Workspace → Apps → Incoming Webhooks
2. Klicke auf "Add to Slack"
3. Wähle den Kanal aus, in dem die Benachrichtigungen erscheinen sollen
4. Kopiere die Webhook URL
5. Füge sie als Repository Secret `SLACK_WEBHOOK_URL` hinzu

Die Benachrichtigungen werden automatisch bei jedem Deployment (Erfolg oder Fehler) gesendet.

### 3. SSH Key generieren

```bash
# Auf deinem lokalen Rechner
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/github_actions_deploy

# Öffentlichen Schlüssel auf Server kopieren
ssh-copy-id -i ~/.ssh/github_actions_deploy.pub user@server

# Privaten Schlüssel für GitHub Secrets kopieren
cat ~/.ssh/github_actions_deploy
```

**Wichtig**: Der private Schlüssel muss komplett kopiert werden (inkl. `-----BEGIN` und `-----END` Zeilen).

### 4. Server-Vorbereitung

Auf dem Server müssen folgende Tools installiert sein:

```bash
# Node.js 20+
node --version

# pnpm (empfohlen) oder npm
pnpm --version
# oder
npm --version

# screen (für Session-Management)
sudo apt-get install screen  # Debian/Ubuntu
# oder
sudo yum install screen      # CentOS/RHEL

# curl (für Health Checks)
curl --version
```

### 5. Deployment-Verzeichnis erstellen

```bash
# Beispiel für Production
sudo mkdir -p /opt/gastropilot/frontend
sudo chown -R $USER:$USER /opt/gastropilot/frontend

# Für andere Umgebungen entsprechend anpassen
```

## 🔄 Workflow-Ablauf

1. **Checkout**: Code wird aus dem Repository gecheckt
2. **Build**:
   - Dependencies werden installiert (pnpm/npm)
   - Next.js Build wird erstellt
3. **Package**: Deployment-Paket wird erstellt (.next, package.json, etc.)
4. **Deploy**:
   - Paket wird per SSH auf Server hochgeladen
   - Alte .next-Version wird gesichert
   - Neue Version wird extrahiert
   - Production Dependencies werden installiert
   - Screen-Session wird gestoppt und neu gestartet
5. **Health Check**: Prüft ob der Service läuft

## 📊 Screen-Sessions

Jede Umgebung läuft in einer eigenen Screen-Session:

- Production: `gastropilot-frontend-prod`
- Staging: `gastropilot-frontend-staging`
- Demo: `gastropilot-frontend-demo`
- Test: `gastropilot-frontend-test`

### Screen-Session verwalten

```bash
# Session anzeigen/verbinden
screen -r gastropilot-frontend-prod

# Session detachen (Service läuft weiter)
# Drücke: Ctrl+A dann D

# Alle Sessions anzeigen
screen -ls

# Session beenden
screen -S gastropilot-frontend-prod -X quit
```

## 🔄 Backup-System

Das Deployment erstellt automatisch Backups der `.next`-Verzeichnisse:

- Format: `.next.backup.<timestamp>`
- Es werden die letzten 3 Backups behalten
- Ältere Backups werden automatisch gelöscht

## 🐛 Troubleshooting

### Problem: SSH-Verbindung schlägt fehl

- Prüfe ob der SSH-Key korrekt in GitHub Secrets eingetragen ist
- Prüfe ob der öffentliche Key auf dem Server installiert ist
- Teste SSH-Verbindung manuell: `ssh -i ~/.ssh/key user@host`

### Problem: Build schlägt fehl

- Prüfe ob alle Dependencies in `package.json` korrekt sind
- Prüfe ob `pnpm-lock.yaml` oder `package-lock.json` vorhanden ist
- Prüfe Build-Logs in GitHub Actions

### Problem: Screen-Session startet nicht

- Prüfe ob `screen` installiert ist: `which screen`
- Prüfe Logs in der Screen-Session: `screen -r <session-name>`
- Prüfe ob Port bereits belegt ist: `netstat -tulpn | grep 3001`

### Problem: Health Check schlägt fehl

- Prüfe ob der Service läuft: `screen -ls`
- Prüfe ob der Port erreichbar ist: `curl http://localhost:3001`
- Prüfe Logs in der Screen-Session

### Problem: Next.js Build fehlgeschlagen

- Prüfe ob alle Environment-Variablen im Secret `FRONTEND_ENV` gesetzt sind
- Prüfe ob `next.config.ts` korrekt konfiguriert ist
- Prüfe Build-Logs für spezifische Fehler

### Problem: Environment-Variablen werden nicht geladen

- Prüfe ob das Secret `FRONTEND_ENV` im korrekten GitHub Environment gesetzt ist
- Prüfe ob die `.env`-Datei auf dem Server vorhanden ist
- Prüfe ob die Variablen mit `NEXT_PUBLIC_` Präfix beginnen (für Client-seitige Variablen)

### Problem: pnpm nicht gefunden

Der Workflow fällt automatisch auf `npm` zurück, wenn `pnpm` nicht verfügbar ist. Für bessere Performance sollte `pnpm` installiert sein:

```bash
npm install -g pnpm
```

## 🔒 Sicherheit

- **Niemals** SSH-Keys im Repository committen
- Verwende separate SSH-Keys für jede Umgebung
- Beschränke SSH-Zugriff auf notwendige Benutzer
- Regelmäßig SSH-Keys rotieren
- Nutze SSH-Keys mit Passphrase für zusätzliche Sicherheit
- Setze Environment-Variablen sicher über GitHub Secrets
- Verwende GitHub Environments für bessere Secret-Isolation

## 📝 Anpassungen

### Ports ändern

Bearbeite die entsprechenden Workflow-Dateien und ändere den Port in der Start-Zeile:

```yaml
pnpm start --port 3001
```

### Package Manager ändern

Der Workflow unterstützt automatisch `pnpm` und `npm`. Um nur `npm` zu verwenden, entferne die `pnpm`-Checks oder setze `npm` als Standard.

### Deployment-Pfad ändern

Setze das Secret `DEPLOY_PATH` im entsprechenden GitHub Environment oder ändere den Standardwert im Workflow.

### Environment-Variablen hinzufügen

Environment-Variablen werden über das Secret `FRONTEND_ENV` gesetzt. Dieses Secret sollte die komplette `.env`-Datei enthalten, z.B.:

```
NEXT_PUBLIC_API_URL=http://localhost:8001/api/v1
NEXT_PUBLIC_APP_VERSION=1.0.0
```

Die `.env`-Datei wird automatisch beim Build verwendet und auf den Server übertragen.

### Zusätzliche Schritte hinzufügen

Füge weitere Steps vor oder nach dem Deploy-Step hinzu:

```yaml
- name: Custom Step
  run: |
    # Deine Befehle hier
```

## 📚 Weitere Ressourcen

- [GitHub Actions Dokumentation](https://docs.github.com/en/actions)
- [GitHub Environments](https://docs.github.com/en/actions/deployment/targeting-different-environments/using-environments-for-deployment)
- [SSH Agent Setup](https://github.com/webfactory/ssh-agent)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Screen Dokumentation](https://www.gnu.org/software/screen/)
