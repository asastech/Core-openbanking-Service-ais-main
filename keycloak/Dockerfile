FROM quay.io/keycloak/keycloak:19.0.1 as BUILDER

ENV KC_HEALTH_ENABLED=true
ENV KC_METRICS_ENABLED=true
ENV KC_FEATURES_DISABLED=preview,web-authn,docker,openshift-integration
ENV DB_VENDOR=POSTGRES

# Install Prometheus metrics provider
RUN curl -sL https://github.com/aerogear/keycloak-metrics-spi/releases/download/2.5.3/keycloak-metrics-spi-2.5.3.jar -o /opt/keycloak/providers/keycloak-metrics-spi-2.5.3.jar

RUN /opt/keycloak/bin/kc.sh build

FROM quay.io/keycloak/keycloak:19.0.1

COPY --from=BUILDER /opt/keycloak/ /opt/keycloak/

WORKDIR /opt/keycloak

# temporary
RUN keytool -genkeypair -storepass password -storetype PKCS12 -keyalg RSA -keysize 4096 -dname "CN=server" -alias server -ext "SAN:c=DNS:localhost,IP:127.0.0.1" -keystore conf/server.keystore

ENV DB_VENDOR=POSTGRES
ENV DB_ADDR=${DB_ADDR:-localhost:5432}
ENV DB_DATABASE=${DB_DATABASE:-keycloak}
ENV DB_USER=${DB_USER:-keycloak}
ENV DB_SCHEMA=${DB_SCHEMA:-public}
ENV DB_PASSWORD=${DB_PASSWORD:-password}
ENV KEYCLOAK_ADMIN=${KEYCLOAK_ADMIN:-admin}
ENV KEYCLOAK_ADMIN_PASSWORD=${KEYCLOAK_ADMIN_PASSWORD:-admin}
ENV KC_HOSTNAME=localhost

# seed data location
ARG KC_DATA

# import dev only realms
COPY data/${KC_DATA} /opt/keycloak_import/
RUN /opt/keycloak/bin/kc.sh import --file /opt/keycloak_import/${KC_DATA}

ENTRYPOINT ["/opt/keycloak/bin/kc.sh"]