# Mochi Projects app Makefile

.PHONY: all clean web

all: web

web:
	cd web && pnpm install && pnpm run build

clean:
	rm -rf web/dist web/node_modules
