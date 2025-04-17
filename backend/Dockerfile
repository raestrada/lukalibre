# -------- 1) Build stage --------
    FROM golang:1.21-bookworm AS builder

    WORKDIR /workspace
    
    # Copiamos go.mod / go.sum de raíz y de submódulos
    COPY go.mod go.sum ./
    COPY backend/go.mod backend/go.sum ./backend/
    
    RUN go mod download
    
    # Copiamos el código de backend
    COPY backend ./backend
    
    # Compilamos binario estático (CGO deshabilitado)
    RUN CGO_ENABLED=0 \
        GOOS=linux \
        GOARCH=amd64 \
        go build -o /workspace/lukalibre ./backend
    
    # -------- 2) Runtime stage (distroless) --------
    FROM gcr.io/distroless/base-debian12
    
    ENV PORT=8080
    EXPOSE 8080
    
    # Copiamos binario
    COPY --from=builder /workspace/lukalibre /usr/local/bin/lukalibre
    
    # Usuario no‑root incluido en distroless
    USER nonroot:nonroot
    
    ENTRYPOINT ["/usr/local/bin/lukalibre"]
    