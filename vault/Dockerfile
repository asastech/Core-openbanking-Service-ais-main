FROM alpine:3.16

RUN apk --update --no-cache add vault curl tini libcap bash openssl net-tools ca-certificates

RUN rm -rf /var/cache/apk/*

ENV UID=10001

RUN addgroup -S vault-service

RUN adduser -D \
	--disabled-password \ 
	--uid "${UID}" \
	vault-user \
	-G vault-service

RUN	setcap cap_ipc_lock=+ep "$(readlink -f /usr/sbin/vault)"

USER vault-user

VOLUME ["/vault/ssl", "/vault/config", "/vault/audit", "/vault/data"]

ENTRYPOINT ["/sbin/tini", "--", "vault"]
