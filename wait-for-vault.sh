#!/bin/sh

VAULT_ADDR=${VAULT_ADDR:-http://localhost:8200}
RETRIES=60

echo -n "Waiting for Vault to start on ${VAULT_ADDR}\n"
until curl -f -s "${VAULT_ADDR}/v1/sys/health?standbyok=true" > /dev/null
do
	RETRIES=$(($RETRIES - 1))
	if [ $RETRIES -eq 0 ]
	then
		echo "Failed to connect to Vault\n"
		exit 1
	fi
	sleep 1
done