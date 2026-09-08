# Despliegue de LegalMind en el servidor del colegio

Esta configuración ejecuta frontend, API, PostgreSQL con `pgvector`, Ollama y
un proxy Caddy. Solamente Caddy publica puertos; PostgreSQL y Ollama permanecen
dentro de la red privada de contenedores.

## 1. Requisitos del servidor

- Linux de 64 bits.
- Docker Engine y Docker Compose v2.
- Al menos 16 GB de RAM y 15 GB libres en disco.
- Recomendado: GPU NVIDIA con 8 GB de VRAM o más, drivers instalados y NVIDIA
  Container Toolkit.
- Una IP fija dentro de la red escolar o un dominio que apunte al servidor.

## 2. Configurar secretos y dirección

Desde la raíz del repositorio:

```bash
cp deploy/.env.example deploy/.env
openssl rand -hex 24
openssl rand -hex 32
openssl rand -hex 32
```

Editar `deploy/.env` y reemplazar `POSTGRES_PASSWORD`, `BETTER_AUTH_SECRET` y
`AUDIT_HASH_SALT`, respectivamente, con los tres resultados. La contraseña
hexadecimal evita caracteres que requieren codificación especial dentro de la
URL de PostgreSQL.

Para una demo en la red local:

```dotenv
PUBLIC_URL=http://192.168.1.50
SITE_ADDRESS=:80
```

Reemplazar la IP por la IP fija del servidor. Para un dominio público:

```dotenv
PUBLIC_URL=https://legalmind.colegio.edu
SITE_ADDRESS=legalmind.colegio.edu
```

Caddy solicitará y renovará automáticamente el certificado HTTPS. Los puertos
80 y 443 deben llegar al servidor.

## 3. Iniciar

Sin GPU:

```bash
docker compose --env-file deploy/.env -f deploy/compose.yml up -d --build
```

Con GPU NVIDIA:

```bash
docker compose --env-file deploy/.env \
  -f deploy/compose.yml -f deploy/compose.gpu.yml up -d --build
```

La primera ejecución descarga PostgreSQL, Ollama y los modelos. Puede tardar
varios minutos. Revisar el avance con:

```bash
docker compose --env-file deploy/.env -f deploy/compose.yml ps
docker compose --env-file deploy/.env -f deploy/compose.yml logs -f ollama-models
docker compose --env-file deploy/.env -f deploy/compose.yml logs -f backend
```

Después abrir el valor de `PUBLIC_URL` desde una computadora de la misma red.

## 4. Verificar

```bash
curl http://192.168.1.50/api/health
curl http://192.168.1.50/api/ia/health
```

Para un dominio HTTPS, reemplazar la dirección por el dominio configurado. La
salud completa, incluida base de datos, autenticación e índices, está en:

```bash
curl https://legalmind.colegio.edu/api/health/demo
```

## 5. Conservar o trasladar los datos

Los datos sobreviven reinicios en volúmenes de Docker: `postgres_data`,
`ollama_data`, `uploads_data` y `ocr_cache`. No ejecutar `docker compose down -v`
porque elimina esos volúmenes.

Para llevar la base actual al servidor, crear un respaldo en la computadora de
desarrollo y restaurarlo en el contenedor:

```bash
pg_dump --format=custom --file=legalmind.dump "$DATABASE_URL"
docker compose --env-file deploy/.env -f deploy/compose.yml \
  exec -T database pg_restore --clean --if-exists --no-owner \
  -U legalmind_app -d legalmind < legalmind.dump
```

Los archivos originales de `backend/uploads` deben copiarse aparte al volumen
`uploads_data` si se quiere conservar los documentos ya cargados.

## 6. Acceso desde Internet sin abrir puertos

Si la red del colegio bloquea conexiones entrantes, se puede instalar
Cloudflare Tunnel en el servidor y dirigir el hostname al servicio local
`http://localhost:80`. Debe publicarse LegalMind mediante Caddy, nunca el puerto
`11434` de Ollama ni el `5432` de PostgreSQL.

## Operación habitual

```bash
# Estado
docker compose --env-file deploy/.env -f deploy/compose.yml ps

# Logs
docker compose --env-file deploy/.env -f deploy/compose.yml logs -f --tail=200

# Actualizar después de un git pull
docker compose --env-file deploy/.env -f deploy/compose.yml up -d --build

# Detener sin borrar información
docker compose --env-file deploy/.env -f deploy/compose.yml down
```
