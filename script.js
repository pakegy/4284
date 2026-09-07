document.addEventListener("DOMContentLoaded", () => {

    const encodeBtn = document.getElementById("encodeBtn");
    const decodeBtn = document.getElementById("decodeBtn");

    const messageInput = document.getElementById("messageInput");
    const passwordInput = document.getElementById("passwordInput");

    const codeInput = document.getElementById("codeInput");
    const decodePasswordInput = document.getElementById("decodePasswordInput");

    const result = document.getElementById("result");


    // تحويل ArrayBuffer إلى Base64
    function arrayBufferToBase64(buffer) {
        const bytes = new Uint8Array(buffer);

        let binary = "";

        for (const byte of bytes) {
            binary += String.fromCharCode(byte);
        }

        return btoa(binary);
    }


    // تحويل Base64 إلى Uint8Array
    function base64ToUint8Array(base64) {
        const binary = atob(base64);

        const bytes = new Uint8Array(binary.length);

        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }

        return bytes;
    }


    // اشتقاق مفتاح تشفير من كلمة المرور
    async function deriveKey(password, salt) {

        const passwordBytes = new TextEncoder().encode(password);

        const keyMaterial = await crypto.subtle.importKey(
            "raw",
            passwordBytes,
            "PBKDF2",
            false,
            ["deriveKey"]
        );

        return crypto.subtle.deriveKey(
            {
                name: "PBKDF2",
                salt: salt,
                iterations: 250000,
                hash: "SHA-256"
            },
            keyMaterial,
            {
                name: "AES-GCM",
                length: 256
            },
            false,
            ["encrypt", "decrypt"]
        );
    }


    // تشفير الرسالة
    encodeBtn.addEventListener("click", async () => {

        const message = messageInput.value.trim();
        const password = passwordInput.value;

        if (!message) {
            result.textContent = "اكتب رسالة أولًا.";
            return;
        }

        if (!password) {
            result.textContent = "أدخل كلمة مرور أولًا.";
            return;
        }

        try {

            result.textContent = "جاري تشفير الرسالة...";

            const encoder = new TextEncoder();

            const messageBytes = encoder.encode(message);

            // Salt عشوائي
            const salt = crypto.getRandomValues(
                new Uint8Array(16)
            );

            // IV عشوائي
            const iv = crypto.getRandomValues(
                new Uint8Array(12)
            );

            const key = await deriveKey(password, salt);

            const encrypted = await crypto.subtle.encrypt(
                {
                    name: "AES-GCM",
                    iv: iv
                },
                key,
                messageBytes
            );


            /*
             * الكود النهائي يحتوي على:
             * salt + iv + encrypted message
             */

            const encryptedBytes = new Uint8Array(encrypted);

            const combined = new Uint8Array(
                salt.length +
                iv.length +
                encryptedBytes.length
            );

            combined.set(salt, 0);

            combined.set(iv, salt.length);

            combined.set(
                encryptedBytes,
                salt.length + iv.length
            );


            const encoded = arrayBufferToBase64(combined);

const code = "4284-" + encoded.match(/.{1,4}/g).join("-");

            result.textContent = code;

        } catch (error) {

            console.error(error);

            result.textContent =
                "حدث خطأ أثناء تشفير الرسالة.";

        }

    });


    // فك تشفير الرسالة
    decodeBtn.addEventListener("click", async () => {

        const code = codeInput.value.trim();
        const password = decodePasswordInput.value;

        if (!code) {
            result.textContent = "أدخل كود 4284 أولًا.";
            return;
        }

        if (!password) {
            result.textContent = "أدخل كلمة المرور.";
            return;
        }

        if (!code.startsWith("4284-")) {
            result.textContent = "هذا ليس كود 4284 صالحًا.";
            return;
        }

        try {

            result.textContent = "جاري كشف الرسالة...";

const encoded = code.substring(5).replace(/-/g, "");

            const combined = base64ToUint8Array(encoded);


            // استخراج Salt
            const salt = combined.slice(0, 16);

            // استخراج IV
            const iv = combined.slice(16, 28);

            // استخراج النص المشفر
            const encrypted = combined.slice(28);


            const key = await deriveKey(password, salt);


            const decrypted = await crypto.subtle.decrypt(
                {
                    name: "AES-GCM",
                    iv: iv
                },
                key,
                encrypted
            );


            const message = new TextDecoder().decode(decrypted);

            result.textContent = message;

        } catch (error) {

            console.error(error);

            result.textContent =
                "كلمة المرور خاطئة أو الكود غير صالح.";

        }

    });

});
