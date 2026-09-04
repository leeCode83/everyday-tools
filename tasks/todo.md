# Todo: Compress Video

## Phase 0: Foundation
- [x] Task 1: Arsipkan plan lama + tulis plan/todo baru
- [x] Task 2: ESLint + typecheck scripts project-wide

### Checkpoint Foundation
- [x] `npm run lint`, `npm run typecheck`, `npm test`, `npm run build` hijau

## Phase 1: Core logic (TDD)
- [x] Task 3: core/format.ts
- [x] Task 4: core/types.ts + core/settings.ts
- [x] Task 5: core/protocol.ts

### Checkpoint Core Logic
- [x] Semua unit test hijau, lint + typecheck hijau, belum ada UI

## Phase 2: Encoding integration
- [x] Task 6: mediabunny + videoCompressor.ts
- [ ] Task 7: worker.ts bridge
- [ ] Task 8: UI (index.html + style.css + main.ts)

### Checkpoint UI
- [ ] E2E manual di browser: kompres nyata (preset + target), progress,
      download, nol network request eksternal; build sukses

## Phase 3: Integration + dokumentasi
- [ ] Task 9: Kartu homepage + README tool
- [ ] Task 10: Final gate (isolasi + semua gate hijau)

### Checkpoint Complete
- [ ] Semua acceptance criteria terpenuhi, siap PR
