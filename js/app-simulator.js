// =========================================================
// 1. FUNGSI GLOBAL (WAJIB ADA DI PALING ATAS)
// =========================================================

// Fungsi Helper: SHA-256 (Digunakan oleh semua simulasi)
async function sha256(msg) {
    const enc = new TextEncoder();
    const buf = await crypto.subtle.digest("SHA-256", enc.encode(msg));
    return Array.from(new Uint8Array(buf))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
}

// Fungsi Helper: Update Jam (Hanya untuk Home)
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


// =========================================================
// 2. LOGIKA HALAMAN HASH (hash.html)
// =========================================================
const hashInput = document.getElementById("hash-input");
if (hashInput) {
    hashInput.addEventListener("input", async (e) => {
        document.getElementById("hash-output").textContent = await sha256(e.target.value);
    });
    // Init saat load
    (async () => {
        document.getElementById("hash-output").textContent = await sha256(hashInput.value);
    })();
}


// =========================================================
// 3. LOGIKA HALAMAN SINGLE BLOCK (block.html)
// =========================================================
const blockPage = document.getElementById("page-block");
if (blockPage) {
    const blockData = document.getElementById("block-data");
    const blockNonce = document.getElementById("block-nonce");
    const blockHash = document.getElementById("block-hash");
    const blockTimestamp = document.getElementById("block-timestamp");
    const speedControl = document.getElementById("speed-control");
    const blockNumberInput = document.getElementById("block-number");
    const btnMine = document.getElementById("btn-mine");

    async function updateBlockHash() {
        const num = blockNumberInput.value || "0";
        const data = blockData.value;
        const ts = blockTimestamp.value || "";
        const nonce = blockNonce.value || "0";
        blockHash.textContent = await sha256(num + ts + data + nonce);
    }

    // Event Listeners
    blockNonce.addEventListener("input", (e) => {
        e.target.value = e.target.value.replace(/[^0-9]/g, "");
        updateBlockHash();
    });
    blockData.addEventListener("input", updateBlockHash);
    blockNumberInput.addEventListener("input", updateBlockHash);

    // Tombol Mine
    if (btnMine) {
        btnMine.addEventListener("click", async () => {
            const num = blockNumberInput.value || "0";
            const data = blockData.value;
            const speedMultiplier = parseInt(speedControl.value) || 1;
            const baseBatch = 1000;
            const batchSize = baseBatch * speedMultiplier;
            const difficulty = "0000";
            const status = document.getElementById("mining-status");
            
            // Set timestamp baru saat mining dimulai
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
    }
    updateBlockHash(); // Init awal
}


// =========================================================
// 4. LOGIKA HALAMAN BLOCKCHAIN (chain.html)
// =========================================================
const chainDiv = document.getElementById("blockchain");
if (chainDiv) { // Cek apakah kita di halaman Blockchain?
    const ZERO_HASH = "0".repeat(64);
    let blocks = [];

    function renderChain() {
        chainDiv.innerHTML = "";
        blocks.forEach((blk, i) => {
            const div = document.createElement("div");
            // Cek validitas hash (harus mulai 0000)
            div.className = "blockchain-block" + (blk.hash.startsWith("0000") ? "" : " invalid");
            div.innerHTML = `
                <h5 class="card-title">Block #${blk.index}</h5>
                <div class="mb-2"><label class="form-label small">Previous Hash:</label><div class="output-hash-display small">${blk.previousHash}</div></div>
                <div class="mb-2"><label class="form-label small">Data:</label><textarea class="form-control form-control-sm" rows="2" oninput="onChainDataChange(${i},this.value)">${blk.data}</textarea></div>
                <button onclick="mineChainBlock(${i})" class="btn btn-sm btn-success w-100 mb-2">Mine</button>
                <div id="status-${i}" class="status text-muted small mb-2"></div>
                <div class="mb-1"><label class="form-label small">Timestamp:</label><div id="timestamp-${i}" class="form-control form-control-sm small">${blk.timestamp}</div></div>
                <div class="mb-1"><label class="form-label small">Nonce:</label><div id="nonce-${i}" class="form-control form-control-sm small">${blk.nonce}</div></div>
                <div><label class="form-label small">Hash:</label><div id="hash-${i}" class="output-hash-display small">${blk.hash}</div></div>`;
            chainDiv.appendChild(div);
        });
    }

    async function addChainBlock() {
        const idx = blocks.length;
        const prev = idx ? blocks[idx - 1].hash : ZERO_HASH;
        const ts = new Date().toLocaleString("en-US", { timeZone: "Asia/Jakarta" });
        const data = "Data Blok " + idx;
        const { nonce, hash } = await mineInitialBlock(prev, data, ts);
        const blk = { index: idx, data: data, previousHash: prev, timestamp: ts, nonce: nonce, hash: hash };
        blocks.push(blk);
        renderChain();
    }

    async function mineInitialBlock(prev, data, timestamp) {
        let nonce = 0;
        const difficulty = "0000";
        const dataToHashPrefix = prev + timestamp + data;
        while (true) {
            const hash = await sha256(dataToHashPrefix + nonce);
            if (hash.startsWith(difficulty)) return { nonce, hash };
            nonce++;
            if (nonce % 10000 === 0) await new Promise(res => setTimeout(res, 0));
        }
    }

    window.onChainDataChange = async function (i, val) {
        blocks[i].data = val;
        // Hitung ulang hash (akan invalid karena nonce belum di-mine ulang)
        blocks[i].hash = await sha256(blocks[i].previousHash + blocks[i].timestamp + blocks[i].data + blocks[i].nonce);
        await validateChain(i + 1);
        renderChain();
    };

    async function validateChain(startIndex) {
        for (let j = startIndex; j < blocks.length; j++) {
            const prevHash = blocks[j - 1].hash;
            blocks[j].previousHash = prevHash;
            blocks[j].hash = await sha256(blocks[j].previousHash + blocks[j].timestamp + blocks[j].data + blocks[j].nonce);
        }
    }

    window.mineChainBlock = function (i) {
        const blk = blocks[i];
        if (i > 0) blk.previousHash = blocks[i-1].hash;
        const prev = blk.previousHash;
        const data = blk.data;
        const difficulty = "0000";
        const batchSize = 1000 * 50;
        blk.nonce = 0;
        blk.timestamp = new Date().toLocaleString("en-US", { timeZone: "Asia/Jakarta" });
        const t0 = performance.now();
        const status = document.getElementById(`status-${i}`);
        
        if (status) status.textContent = "Proses mining...";
        const dataToHashPrefix = prev + blk.timestamp + data;

        async function step() {
            const promises = [];
            for (let j = 0; j < batchSize; j++) promises.push(sha256(dataToHashPrefix + (blk.nonce + j)));
            const results = await Promise.all(promises);
            for (let j = 0; j < results.length; j++) {
                const h = results[j];
                if (h.startsWith(difficulty)) {
                    blk.nonce += j;
                    blk.hash = h;
                    // Update tampilan
                    if(document.getElementById(`nonce-${i}`)) document.getElementById(`nonce-${i}`).textContent = blk.nonce;
                    if(document.getElementById(`hash-${i}`)) document.getElementById(`hash-${i}`).textContent = h;
                    if(document.getElementById(`timestamp-${i}`)) document.getElementById(`timestamp-${i}`).textContent = blk.timestamp;
                    
                    const dur = ((performance.now() - t0) / 1000).toFixed(3);
                    if (status) status.textContent = `Mining selesai (${dur}s)`;
                    
                    await validateChain(i + 1);
                    renderChain();
                    return;
                }
            }
            blk.nonce += batchSize;
            if(document.getElementById(`nonce-${i}`)) document.getElementById(`nonce-${i}`).textContent = blk.nonce;
            setTimeout(step, 0);
        }
        step();
    };

    const btnAddBlock = document.getElementById("btn-add-block");
    if (btnAddBlock) {
        btnAddBlock.onclick = addChainBlock;
        addChainBlock(); // Tambah genesis block saat load
    }
}


// =========================================================
// 5. LOGIKA HALAMAN ECC (ecc.html)
// =========================================================
const eccPage = document.getElementById("page-ecc");
if (eccPage) {
    // Cek library elliptic
    if (typeof elliptic === 'undefined') {
        console.error("Library elliptic.js belum dimuat! Pastikan ada di <head>.");
    } else {
        const ec = new elliptic.ec("secp256k1");
        const eccPrivate = document.getElementById("ecc-private");
        const eccPublic = document.getElementById("ecc-public");
        const eccMessage = document.getElementById("ecc-message");
        const eccSignature = document.getElementById("ecc-signature");
        const eccVerifyResult = document.getElementById("ecc-verify-result");
        const btnGenKey = document.getElementById("btn-generate-key");
        const btnSign = document.getElementById("btn-sign");
        const btnVerify = document.getElementById("btn-verify");

        function randomPrivateHex() {
            const arr = new Uint8Array(32);
            crypto.getRandomValues(arr);
            return Array.from(arr).map((b) => b.toString(16).padStart(2, "0")).join("");
        }
        function normHex(h) {
            if (!h) return "";
            return h.toLowerCase().replace(/^0x/, "");
        }

        btnGenKey.onclick = () => {
            const priv = randomPrivateHex();
            const key = ec.keyFromPrivate(priv, "hex");
            const pub = "04" + key.getPublic().getX().toString("hex").padStart(64, "0") + key.getPublic().getY().toString("hex").padStart(64, "0");
            eccPrivate.value = priv;
            eccPublic.value = pub;
            eccSignature.value = "";
            eccVerifyResult.textContent = "";
        };
        btnGenKey.onclick(); // Auto-generate saat load

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

        btnVerify.onclick = async () => {
            try {
                const msg = eccMessage.value;
                const sig = normHex(eccSignature.value.trim());
                const pub = normHex(eccPublic.value.trim());
                
                if (!msg || !sig || !pub) { alert("Lengkapi semua field!"); return; }
                
                const key = ec.keyFromPublic(pub, "hex");
                const valid = key.verify(await sha256(msg), sig);
                
                eccVerifyResult.textContent = valid ? "Signature VALID!" : "Signature TIDAK valid!";
                eccVerifyResult.style.color = valid ? "var(--bs-success)" : "var(--bs-danger)";
                eccVerifyResult.style.fontWeight = "bold";
            } catch (e) {
                eccVerifyResult.textContent = "Error verifikasi: Public Key/Signature invalid.";
                eccVerifyResult.style.color = "var(--bs-danger)";
                console.error(e);
            }
        };
    }
}


// =========================================================
// 6. LOGIKA HALAMAN KONSENSUS (konsensus.html)
// =========================================================
const consensusPage = document.getElementById("page-consensus");
if (consensusPage) {
    const ZERO = "0".repeat(64);
    let balances = { A: 100, B: 100, C: 100 };
    let txPool = [];
    let chainsConsensus = { A: [], B: [], C: [] };

    // Update tampilan saldo
    function updateBalancesDOM() {
        ["A", "B", "C"].forEach((u) => {
            const el = document.getElementById("saldo-" + u);
            if (el) el.textContent = balances[u];
        });
    }

    // Parsing string transaksi "A -> B: 10"
    function parseTx(line) {
        const m = line.match(/^([A-C])\s*->\s*([A-C])\s*:\s*(\d+)$/);
        if (!m) return null;
        return { from: m[1], to: m[2], amt: parseInt(m[3]) };
    }

    // Mining khusus konsensus (mencari nonce)
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
                    if (results[i].startsWith(diff)) {
                        resolve({ nonce: nonce + i, hash: results[i] });
                        return;
                    }
                }
                nonce += batch;
                setTimeout(loop, 0);
            }
            loop();
        });
    }

    // Buat Genesis Block
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
        
        // Copy genesis ke semua user
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
                
                // Event listener untuk tampering data
                const ta = d.querySelector("textarea.data");
                ta.addEventListener("input", (e) => {
                    chainsConsensus[u][i].data = e.target.value;
                });
                
                cont.appendChild(d);
            });
        });
    }

    // Tombol Kirim untuk A, B, C
    ["A", "B", "C"].forEach((u) => {
        const btn = document.getElementById("send-" + u);
        if (btn) {
            btn.onclick = () => {
                const amt = parseInt(document.getElementById("amount-" + u).value);
                const to = document.getElementById("receiver-" + u).value;
                
                if (amt <= 0 || isNaN(amt)) { alert("Jumlah harus > 0"); return; }
                if (u === to) { alert("Tidak bisa kirim ke diri sendiri"); return; }

                // Cek saldo (termasuk yang pending di mempool)
                let tempBalance = balances[u];
                txPool.forEach(txLine => {
                    const tx = parseTx(txLine);
                    if (tx && tx.from === u) { tempBalance -= tx.amt; }
                });

                if (tempBalance < amt) { alert("Saldo tidak cukup (termasuk pending transaksi)"); return; }

                const tx = `${u} -> ${to}: ${amt}`;
                txPool.push(tx);
                document.getElementById("mempool").value = txPool.join("\n");
            };
        }
    });

    // Tombol Mine Semua Transaksi
    const btnMineAll = document.getElementById("btn-mine-all");
    btnMineAll.onclick = async () => {
        if (txPool.length === 0) { alert("Tidak ada transaksi untuk di-mine."); return; }
        
        // Verifikasi format transaksi
        const parsed = [];
        for (const t of txPool) {
            const tx = parseTx(t);
            if (!tx) { alert("Format transaksi salah: " + t); return; }
            parsed.push(tx);
        }

        // Verifikasi saldo sekali lagi sebelum mining
        const tmp = { ...balances };
        for (const tx of parsed) {
            if (tmp[tx.from] < tx.amt) { alert("Saldo " + tx.from + " tidak cukup."); return; }
            tmp[tx.from] -= tx.amt;
            tmp[tx.to] += tx.amt;
        }

        const ts = new Date().toLocaleString("en-US", { timeZone: "Asia/Jakarta" });
        const data = txPool.join(" | ");
        
        // Ambil hash terakhir dari chain A (asumsi A yang mining)
        const prev = chainsConsensus.A.at(-1).hash;
        
        // Lakukan mining
        const r = await shaMine(prev, data, ts);
        
        const newBlock = { index: chainsConsensus.A.length, prev, data, timestamp: ts, nonce: r.nonce, hash: r.hash, invalid: false };
        
        // Update saldo permanen
        balances = tmp;
        updateBalancesDOM();

        // Broadcast blok baru ke semua user
        for (const u of ["A", "B", "C"]) {
            chainsConsensus[u].push(JSON.parse(JSON.stringify(newBlock)));
        }
        
        txPool = [];
        document.getElementById("mempool").value = "";
        renderConsensusChains();
        alert("Mining Selesai! Blok baru ditambahkan ke semua node.");
    };

    // Tombol Verify
    const btnVerify = document.getElementById("btn-verify-consensus");
    if(btnVerify) {
        btnVerify.onclick = async () => {
            let chainInvalid = false;
            for (const u of ["A", "B", "C"]) {
                for (let i = 1; i < chainsConsensus[u].length; i++) {
                    const blk = chainsConsensus[u][i];
                    const prevBlk = chainsConsensus[u][i - 1];
                    const expectedPrev = prevBlk.hash;
                    
                    const recomputed = await sha256(blk.prev + blk.data + blk.timestamp + blk.nonce);
                    
                    // Tandai invalid jika hash berubah atau prev hash tidak cocok
                    blk.invalid = (recomputed !== blk.hash || blk.prev !== expectedPrev);
                    if (blk.invalid) chainInvalid = true;
                }
            }
            renderConsensusChains(); // Refresh visual (blok invalid jadi merah)
            
            if (chainInvalid) {
                alert("Verifikasi Selesai: Ditemukan blok yang dimanipulasi (warna merah)!");
            } else {
                alert("Verifikasi Selesai: Semua blockchain valid.");
            }
        };
    }

    // Tombol Consensus (Longest Chain Rule)
    const btnConsensus = document.getElementById("btn-consensus");
    if(btnConsensus) {
        btnConsensus.onclick = async () => {
            try {
                let longestValidChain = [];
                let maxLen = -1;

                // Cari rantai terpanjang yang valid
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

                // Salin rantai terpanjang ke semua node (Consensus tercapai)
                for (const u of ["A", "B", "C"]) {
                    chainsConsensus[u] = JSON.parse(JSON.stringify(longestValidChain));
                }

                // Hitung ulang saldo berdasarkan rantai yang menang
                const newBalances = { A: 100, B: 100, C: 100 };
                for (let i = 1; i < longestValidChain.length; i++) {
                    const data = longestValidChain[i].data;
                    const txs = data.split(" | ");
                    txs.forEach(t => {
                        const tx = parseTx(t);
                        if (tx) {
                            newBalances[tx.from] -= tx.amt;
                            newBalances[tx.to] += tx.amt;
                        }
                    });
                }
                balances = newBalances;
                
                renderConsensusChains();
                updateBalancesDOM();
                alert("Konsensus Tercapai! Semua node disinkronkan ke rantai terpanjang yang valid.");
            } catch (e) {
                console.error(e);
                alert("Error saat menjalankan konsensus.");
            }
        };
    }
}
