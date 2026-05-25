# AGENT.md

## Project Snapshot
- Repository: `El-cmd/Ft_transcendence`
- Default branch: `main`
- Detected stack: Python, Docker, static web, shell scripts
- Notable root entries: `api_gateway/`, `chat_managment/`, `event_managment/`, `front/`, `https_proxy/`, `user_managment/`, `demo.gif`, `docker-compose.yml`, `Makefile`, `README.md`
- Source mix: .py:93, .js:55, .jpg:35, .html:23, .css:18, dockerfile:6

## Working Guidelines
- Keep changes scoped to the requested behavior and follow the style already present in the touched files.
- Check `README.md`, `Makefile`, package scripts, and Docker files before introducing new commands or tooling.
- Validate Docker changes with the compose/build command before pushing.
- Do not commit local secrets, `.env` files, generated dependency folders, build artifacts, or editor metadata.

## Setup
- `No explicit dependency install command is defined in the repository.`

## Run
- `docker compose up --build`

## Validate
- `make`
- `make re`
- `make clean`
- `make fclean`
- `docker compose config`

## Makefile Targets Detected
- `all`, `clean`, `fclean`, `re`, `logs`, `rebuild`, `service_shell`
