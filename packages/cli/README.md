## Installing the CLI globally

From the repo root, after building:
```powershell
pnpm --filter @business-os/cli build
pnpm --filter @business-os/cli exec pnpm link --global
```
Then `bos` is available anywhere. Verify with `bos --version`.
