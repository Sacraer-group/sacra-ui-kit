.PHONY: build test test-browser
ROOT := $(CURDIR)
BIN := $(ROOT)/bin/sacra-tui
build:
	sh scripts/build.sh
test: build
	cd go && go test -race ./... && go vet ./...
	SACRA_TUI_BIN="$(BIN)" python3 tests/integration.py
	SACRA_TUI_BIN="$(BIN)" node --test javascript/test.mjs
	SACRA_TUI_BIN="$(BIN)" python3 tests/schema_test.py
	SACRA_TUI_BIN="$(BIN)" python3 tests/pty_cleanup.py
	tsc --noEmit --strict --module nodenext --moduleResolution nodenext --target es2022 tests/types.ts
test-browser:
	python3 ../topology/tests/edges_geometry.py
	python3 ../topology/tests/scroll_regression.py
	python3 tests/browser_adapter.py
