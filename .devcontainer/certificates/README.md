# Optionale CA-Zertifikate

Dieser Ordner ist für zusätzliche CA-Zertifikate gedacht, falls du hinter
einem Corporate-Proxy mit TLS-Interception arbeitest.

- Lege `*.pem` oder `*.crt` Dateien hier ab.
- Beim Image-Build (`devenv.dockerfile`) werden sie automatisch in den
  System-CA-Store aufgenommen (`update-ca-certificates`).
- Für Node.js setze zusätzlich `NODE_EXTRA_CA_CERTS` – siehe `.env.example`.

Alle Dateien außer `.gitkeep` und dieser `README.md` sind gitignored.
Zertifikate werden also nie versehentlich ins Repo gepusht.
