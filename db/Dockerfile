FROM mariadb:11.4

# Initialize schema/user setup on first container start.
COPY backend/setup_mariadb.sql /docker-entrypoint-initdb.d/01-setup.sql
