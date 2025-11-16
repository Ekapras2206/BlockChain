// ================== DATE & TIME ==================
// Kode ini berjalan di Halaman Home (index.html)
const dtElement = document.getElementById("datetime");
if (dtElement) {
    function updateDateTime() {
        const days = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
        const months = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
        const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Jakarta" }));
        const dayName = days[now.getDay()];
        const date = now.getDate();
        const month = months[now.getMonth()];
        const year = now.getFullYear();
        const hh = now.getHours().toString().padStart(2, "0");
        const mm = now.getMinutes().toString().padStart(2, "0");
        const ss = now.getSeconds().toString().padStart(2, "0");
        dtElement.textContent = `${dayName}, ${date} ${month} ${year} (${hh}:${mm}:${ss} WIB)`;
    }
    setInterval(updateDateTime, 1000);
    updateDateTime();
}

// ================== SHA-256 (Fungsi Global) ==================
// Ini harus ada di luar 'if' agar bisa diakses oleh semua halaman
async function sha256(msg) {
    const enc = new TextEncoder();
    const buf = await crypto.subtle.digest("SHA-256", enc.encode(msg));
    return Array.from(new Uint8Array(buf))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
}

// ================== HASH PAGE ==================
const hashInput = document.getElementById("hash-input");
if (hashInput) {
    hashInput.addEventListener("input", async (e) => {
        document.getElementById("hash-output").textContent = await sha256(
            e.target.value
        );
    });
    // Inisialisasi hash output saat load
    (async () => {
        document.getElementById("hash-output").textContent = await sha256(hashInput.value);
    })();
}


// ================== BLOCK PAGE ==================
const blockPage = document.getElementById("page-block");
if (blockPage) {
    const blockData = document.getElementById("block-data");
    const blockNonce = document.getElementById("block-nonce");
    const blockHash = document.getElementById("block-hash");
    const blockTimestamp = document.getElementById("block-timestamp");
    const speedControl = document.getElementById("speed-control");
    const blockNumberInput = document.getElementById("block-number");

    async function updateBlockHash() {
        if (!blockData || !blockNonce || !blockHash || !blockNumberInput) return;
        const num = blockNumberInput.value || "0";
        const data = blockData.value;
        const ts = blockTimestamp.value || "";
        const nonce = blockNonce.value || "0";
        blockHash.textContent = await sha256(num + ts + data + nonce);
    }

    blockNonce.addEventListener("input", (e) => {
        e.target.value = e.target.value.replace(/[^0-9]/g, "");
        updateBlockHash();
    });
    blockData.addEventListener("input", updateBlockHash);
    blockNumberInput.addEventListener("input", updateBlockHash);

    const btnMine = document.getElementById("btn-mine");
    btnMine.addEventListener("click", async () => {
        const num = blockNumberInput.value || "0";
        const data = blockData.value;
        const speedMultiplier = parseInt(speedControl.value) || 1;
        const baseBatch = 1000;
        const batchSize = baseBatch * speedMultiplier;
        const difficulty = "0000";
        const status = document.getElementById("mining-status");
        const timestamp = new Date().toLocaleString("en-US", { timeZone: "Asia/Jakarta" });
        blockTimestamp.value = timestamp;
        blockHash.textContent = "";
        blockNonce.value = "0";
        let nonce = 0;
        if (status) status.textContent = "Mining...";

        const dataToHashPrefix = num + timestamp + data;

        async function mineStep() {
            const promises = [];
            for (let i = 0; i < batchSize; i++) {
                promises.push(sha256(dataToHashPrefix + (nonce + i)));
            }
            const results = await Promise.all(promises);
            for (let i = 0; i < results.length; i++) {
                const h = results[i];
                if (h.startsWith(difficulty)) {
                    blockNonce.value = nonce + i;
                    blockHash.textContent = h;
                    if (status) status.textContent = `Mining selesai (Nonce=${nonce + i})`;
                    return;
                }
            }
            nonce += batchSize;
            blockNonce.value = nonce;
            if (status) status.textContent = `Mining... Nonce=${nonce}`;
            setTimeout(mineStep, 0);
        }
        mineStep();
    });

    updateBlockHash(); // Inisialisasi
}


// --- Blockchain Page ---
const ZERO_HASH = "0".repeat(64);
let blocks = [];
const chainDiv = document.getElementById("blockchain");

function renderChain() {
    chainDiv.innerHTML = "";
    blocks.forEach((blk, i) => {
        const div = document.createElement("div");
        div.className = "blockchain-block";
        div.innerHTML = `
      <h3>Block #${blk.index}</h3>
      <label>Previous Hash:</label>
      <div class="output" id="prev-${i}">${blk.previousHash}</div>

      <label>Data:</label>
      <textarea rows="3" id="data-${i}">${blk.data}</textarea>

      <label>Timestamp:</label>
      <div class="output" id="timestamp-${i}">${blk.timestamp}</div>

      <label>Nonce:</label>
      <div class="output" id="nonce-${i}">${blk.nonce}</div>

      <label>Hash:</label>
      <div class="output" id="hash-${i}">${blk.hash}</div>

      <button id="mine-${i}" class="mine">Mine Block</button>
      <div id="status-${i}" class="status"></div>
    `;
        chainDiv.appendChild(div);

        document.getElementById(`data-${i}`).addEventListener("input", (e) => {
            blocks[i].data = e.target.value;
            blocks[i].hash = "";
            blocks[i].timestamp = "";
            blocks[i].nonce = 0;
            document.getElementById(`hash-${i}`).textContent = "";
        });

        document.getElementById(`mine-${i}`).addEventListener("click", () => {
            mineChainBlock(i);
        });
    });
    // Setelah semua block dirender, kunci blok yang sudah ditambang
    blocks.forEach((blk, i) => {
        if (blk.hash && blk.hash.startsWith("0000")) {
            const dataField = document.getElementById(`data-${i}`);
            if (dataField) dataField.readOnly = true;
        }
    });
}

function addChainBlock() {
    const idx = blocks.length;
    const prev = idx ? blocks[idx - 1].hash || ZERO_HASH : ZERO_HASH;
    const blk = {
        index: idx,
        data: "",
        previousHash: prev,
        timestamp: "",
        nonce: 0,
        hash: "",
    };
    blocks.push(blk);
    renderChain();
    chainDiv.scrollLeft = chainDiv.scrollWidth;
}

async function mineChainBlock(i) {
    const blk = blocks[i];
    const prev = blk.previousHash;
    const data = blk.data;

    const timeDiv = document.getElementById(`timestamp-${i}`);
    const nonceDiv = document.getElementById(`nonce-${i}`);
    const hashDiv = document.getElementById(`hash-${i}`);
    const statusDiv = document.getElementById(`status-${i}`);

    blk.nonce = 0;
    blk.timestamp = new Date().toLocaleString("en-US", {
        timeZone: "Asia/Jakarta",
    });
    timeDiv.textContent = blk.timestamp;
    hashDiv.textContent = "";
    statusDiv.textContent = "Mining dimulai...";
    const difficulty = "0000";

    const baseBatch = 1000;
    const batchSize = baseBatch * 10;
    const startTime = performance.now();

    async function mineBatch() {
        for (let j = 0; j < batchSize; j++) {
            const input = blk.index + prev + data + blk.timestamp + blk.nonce;
            const h = await sha256(input);
            if (h.startsWith(difficulty)) {
                blk.hash = h;
                hashDiv.textContent = h;

                //KUNCI FIELD DATA SETELAH MINING SELESAI
                document.getElementById(`data-${i}`).readOnly = true;

                const durasi = ((performance.now() - startTime) / 1000).toFixed(2);
                statusDiv.textContent = `Selesai! Nonce: ${blk.nonce}, waktu: ${durasi} detik.`;

                if (blocks[i + 1]) {
                    blocks[i + 1].previousHash = blk.hash;
                    renderChain();
                }
                return true;
            }
            blk.nonce++;
        }
        nonceDiv.textContent = blk.nonce;
        statusDiv.textContent = `Mining... Nonce: ${blk.nonce.toLocaleString()}`;
        return false;
    }

    async function mine() {
        const done = await mineBatch();
        if (!done) requestAnimationFrame(mine);
    }
    mine();
}

// --- Init ---
document.getElementById("btn-add-block").onclick = addChainBlock;
addChainBlock();


// ================== ECC DIGITAL SIGNATURE ==================
const eccPage = document.getElementById("page-ecc");
if (eccPage) {
    const ec = new elliptic.ec("secp256k1");
    const eccPrivate = document.getElementById("ecc-private");
    const eccPublic = document.getElementById("ecc-public");
    const eccMessage = document.getElementById("ecc-message");
    const eccSignature = document.getElementById("ecc-signature");
    const eccVerifyResult = document.getElementById("ecc-verify-result");

    function randomPrivateHex() {
        const arr = new Uint8Array(32);
        crypto.getRandomValues(arr);
        return Array.from(arr)
            .map((b) => b.toString(16).padStart(2, "0"))
            .join("");
    }
    function normHex(h) {
        if (!h) return "";
        return h.toLowerCase().replace(/^0x/, "");
    }

    const btnGenKey = document.getElementById("btn-generate-key");
    btnGenKey.onclick = () => {
        const priv = randomPrivateHex();
        const key = ec.keyFromPrivate(priv, "hex");
        const pub = "04" + key.getPublic().getX().toString("hex").padStart(64, "0") + key.getPublic().getY().toString("hex").padStart(64, "0");
        eccPrivate.value = priv;
        eccPublic.value = pub;
        eccSignature.value = "";
        eccVerifyResult.textContent = "";
    };
    btnGenKey.onclick(); // Generate kunci saat load

    const btnSign = document.getElementById("btn-sign");
    btnSign.onclick = async () => {
        const msg = eccMessage.value;
        if (!msg) { alert("Isi pesan!"); return; }
        const priv = normHex(eccPrivate.value.trim());
        if (!priv) { alert("Private key kosong!"); return; }
        try {
            const hash = await sha256(msg);
            const sig = ec.keyFromPrivate(priv, "hex").sign(hash, { canonical: true }).toDER("hex");
            eccSignature.value = sig;
            eccVerifyResult.textContent = "";
        } catch (e) {
            alert("Gagal sign: Private Key invalid?");
            console.error(e);
        }
    };

    const btnVerify = document.getElementById("btn-verify");
    btnVerify.onclick = async () => {
        try {
            const msg = eccMessage.value,
                sig = normHex(eccSignature.value.trim()),
                pub = normHex(eccPublic.value.trim());
            if (!msg || !sig || !pub) { alert("Lengkapi semua field!"); return; }
            const key = ec.keyFromPublic(pub, "hex");
            const valid = key.verify(await sha256(msg), sig);
            eccVerifyResult.textContent = valid ? "Signature VALID!" : "Signature TIDAK valid!";
            eccVerifyResult.style.color = valid ? "var(--bs-success)" : "var(--bs-danger)";
            eccVerifyResult.style.fontWeight = "bold";
        } catch (e) {
            eccVerifyResult.textContent = "Error verifikasi: Public Key/Signature invalid.";
            eccVerifyResult.style.color = "var(--bs-danger)";
            eccVerifyResult.style.fontWeight = "bold";
            console.error(e);
        }
    };
}


// ================== KONSENSUS PAGE ==================
const consensusPage = document.getElementById("page-consensus");
if (consensusPage) {
    const ZERO = "0".repeat(64);
    let balances = { A: 100, B: 100, C: 100 };
    let txPool = [];
    let chainsConsensus = { A: [], B: [], C: [] };

    function updateBalancesDOM() {
        ["A", "B", "C"].forEach((u) => {
            const el = document.getElementById("saldo-" + u);
            if (el) el.textContent = balances[u];
        });
    }
    function parseTx(line) {
        const m = line.match(/^([A-C])\s*->\s*([A-C])\s*:\s*(\d+)$/);
        if (!m) return null;
        return { from: m[1], to: m[2], amt: parseInt(m[3]) };
    }

    async function shaMine(prev, data, timestamp) {
        const diff = "000";
        const base = 1000;
        const batch = base * 50;
        return new Promise((resolve) => {
            let nonce = 0;
            async function loop() {
                const promises = [];
                for (let i = 0; i < batch; i++)
                    promises.push(sha256(prev + data + timestamp + (nonce + i)));
                const results = await Promise.all(promises);
                for (let i = 0; i < results.length; i++) {
                    const h = results[i];
                    if (h.startsWith(diff)) {
                        resolve({ nonce: nonce + i, hash: h });
                        return;
                    }
                }
                nonce += batch;
                setTimeout(loop, 0);
            }
            loop();
        });
    }

    async function createGenesisConsensus() {
        const diff = "000";
        const ts = new Date().toLocaleString("en-US", { timeZone: "Asia/Jakarta" });
        let nonce = 0;
        let found = "";
        while (true) {
            const h = await sha256(ZERO + "Genesis Block: 100 coins" + ts + nonce);
            if (h.startsWith(diff)) {
                found = h;
                break;
            }
            nonce++;
        }
        const genesisBlock = { index: 0, prev: ZERO, data: "Genesis Block: 100 coins", timestamp: ts, nonce, hash: found, invalid: false };
        for (let u of ["A", "B", "C"]) {
            chainsConsensus[u] = [JSON.parse(JSON.stringify(genesisBlock))];
        }
        renderConsensusChains();
        updateBalancesDOM();
    }
    createGenesisConsensus(); // Jalankan saat load

    function renderConsensusChains() {
        ["A", "B", "C"].forEach((u) => {
            const cont = document.getElementById("chain-" + u);
            if (!cont) return;
            cont.innerHTML = "";
            chainsConsensus[u].forEach((blk, i) => {
                const d = document.createElement("div");
                d.className = "chain-block" + (blk.invalid ? " invalid" : "");
                d.innerHTML = `
            <div class="small"><strong>Block #${blk.index}</strong></div>
            <div class="small">Prev:</div>
            <input class="form-control form-control-sm small" value="${blk.prev}" readonly style="word-wrap: break-word;">
            <div class="small mt-1">Data:</div>
            <textarea class="data form-control form-control-sm small" rows="3">${blk.data}</textarea>
            <div class="small mt-1">Timestamp:</div>
            <input class="form-control form-control-sm small" value="${blk.timestamp}" readonly>
            <div class="small mt-1">Nonce:</div>
            <input class="form-control form-control-sm small" value="${blk.nonce}" readonly>
            <div class="small mt-1">Hash:</div>
            <input class="form-control form-control-sm small" value="${blk.hash}" readonly style="word-wrap: break-word;">`;
                const ta = d.querySelector("textarea.data");
                ta.addEventListener("input", (e) => {
                    chainsConsensus[u][i].data = e.target.value;
                });
                cont.appendChild(d);
            });
        });
    }

    ["A", "B", "C"].forEach((u) => {
        const btn = document.getElementById("send-" + u);
        btn.onclick = () => {
            const amt = parseInt(document.getElementById("amount-" + u).value);
            const to = document.getElementById("receiver-" + u).value;
            if (amt <= 0 || !amt) { alert("Jumlah > 0"); return; }
            let tempBalance = balances[u];
            txPool.forEach(txLine => {
                const tx = parseTx(txLine);
                if (tx && tx.from === u) { tempBalance -= tx.amt; }
            });
            if (tempBalance < amt) { alert("Saldo tidak cukup (termasuk transaksi di mempool)"); return; }
            const tx = `${u} -> ${to}: ${amt}`;
            txPool.push(tx);
            document.getElementById("mempool").value = txPool.join("\n");
        };
    });

    const btnMineAll = document.getElementById("btn-mine-all");
    btnMineAll.onclick = async () => {
        if (txPool.length === 0) { alert("Tidak ada transaksi."); return; }
        const parsed = [];
        for (const t of txPool) {
            const tx = parseTx(t);
            if (!tx) { alert("Format salah: " + t); return; }
            parsed.push(tx);
        }
        const tmp = { ...balances };
        for (const tx of parsed) {
            if (tmp[tx.from] < tx.amt) { alert("Saldo " + tx.from + " tidak cukup."); return; }
            tmp[tx.from] -= tx.amt;
            tmp[tx.to] += tx.amt;
        }
        const ts = new Date().toLocaleString("en-US", { timeZone: "Asia/Jakarta" });
        const data = txPool.join(" | ");
        const prev = chainsConsensus.A.at(-1).hash;
        const r = await shaMine(prev, data, ts);
        const newBlock = { index: chainsConsensus.A.length, prev, data, timestamp: ts, nonce: r.nonce, hash: r.hash, invalid: false };
        for (const u of ["A", "B", "C"]) {
            chainsConsensus[u].push(JSON.parse(JSON.stringify(newBlock)));
        }
        balances = tmp;
        updateBalancesDOM();
        txPool = [];
        document.getElementById("mempool").value = "";
        renderConsensusChains();
        alert("Mining selesai. Blok baru disiarkan ke semua user.");
    };

    const btnVerifyConsensus = document.getElementById("btn-verify-consensus");
    btnVerifyConsensus.onclick = async () => {
        try {
            let chainInvalid = false;
            for (const u of ["A", "B", "C"]) {
                for (let i = 1; i < chainsConsensus[u].length; i++) {
                    const blk = chainsConsensus[u][i];
                    const prevBlk = chainsConsensus[u][i - 1];
                    const expectedPrev = prevBlk.hash;
                    const recomputed = await sha256(blk.prev + blk.data + blk.timestamp + blk.nonce);
                    blk.invalid = (recomputed !== blk.hash || blk.prev !== expectedPrev);
                    if (blk.invalid) {
                        chainInvalid = true;
                    }
                }
            }
            renderConsensusChains();
            if (chainInvalid) {
                alert("Verifikasi selesai — blok yang invalid ditandai merah.");
            } else {
                alert("Verifikasi selesai — semua chain valid!");
            }
        } catch (err) {
            console.error("Error saat verifikasi Konsensus:", err);
            alert("Terjadi kesalahan saat verifikasi Konsensus. Cek console.");
        }
    };

    const btnConsensus = document.getElementById("btn-consensus");
    btnConsensus.onclick = async () => {
        try {
            let longestValidChain = [];
            let maxLen = -1;
            for (const u of ["A", "B", "C"]) {
                const chain = chainsConsensus[u];
                let isValid = true;
                for (let i = 1; i < chain.length; i++) {
                    const blk = chain[i];
                    const prevBlk = chain[i - 1];
                    const recomputed = await sha256(blk.prev + blk.data + blk.timestamp + blk.nonce);
                    if (recomputed !== blk.hash || blk.prev !== prevBlk.hash) {
                        isValid = false;
                        break;
                    }
                }
                if (isValid && chain.length > maxLen) {
                    maxLen = chain.length;
                    longestValidChain = chain;
                }
            }
            if (maxLen === -1) {
                alert("Semua chain corrupt! Mereset ke Genesis...");
                await createGenesisConsensus();
                return;
            }
            for (const u of ["A", "B", "C"]) {
                chainsConsensus[u] = JSON.parse(JSON.stringify(longestValidChain));
            }
            const newBalances = { A: 100, B: 100, C: 100 };
            for (let i = 1; i < longestValidChain.length; i++) {
                const data = longestValidChain[i].data;
                const txs = data.split(" | ");
                txs.forEach(t => {
                    const tx = parseTx(t);
                    if (tx) {
                        if (newBalances[tx.from] >= tx.amt) {
                            newBalances[tx.from] -= tx.amt;
                            newBalances[tx.to] += tx.amt;
                        }
                    }
                });
            }
            balances = newBalances;
            renderConsensusChains();
            updateBalancesDOM();
            alert("Konsensus selesai. Semua chain disinkronkan ke chain terpanjang yang valid.");
        } catch (e) {
            console.error(e);
            alert("Error saat menjalankan konsensus.");
        }
    };
}