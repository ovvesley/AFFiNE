FROM ghcr.io/toeverything/affine@sha256:b649f5ce2384ffdf13c23bccf81d759e15973d59d0b0058af65d895a84373099
COPY patch-import-limits.mjs /tmp/patch-import-limits.mjs
RUN node /tmp/patch-import-limits.mjs && rm /tmp/patch-import-limits.mjs
LABEL org.opencontainers.image.source="https://github.com/ovvesley/AFFiNE"
