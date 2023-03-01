#!/bin/sh

KEYCLOAK_URL=${KEYCLOAK_URL:-http://localhost:8080}
RETRIES=60

echo -n "Waiting for keycloak to start on ${KEYCLOAK_URL}\n"
until curl -f -s "${KEYCLOAK_URL}/health" > /dev/null
do
	RETRIES=$(($RETRIES - 1))
	if [ $RETRIES -eq 0 ]
	then
		echo "Failed to connect to Keycloak\n"
		exit 1
	fi
	sleep 1
done