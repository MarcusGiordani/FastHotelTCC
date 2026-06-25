import { createGlobalStyle } from 'styled-components';

export const GlobalStyle = createGlobalStyle`
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  html, body, #root {
    height: 100%;
  }

  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
      'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  /* ====== Tema Claro (padrão) ====== */
  :root {
    --card-bg: #ffffff;
    --card-text: #000000;
    --page-bg: #f0f0f0;
    --input-bg: #ffffff;
    --input-border: #cccccc;
    --input-text: #000000;
    --input-placeholder: #999999;
    --table-header-bg: #f0f0f0;
    --table-row-even: #f0f0f0;
    --table-row-hover: #e0f2f7;
    --table-text: #000000;
    --table-border: #f0f0f0;
    --select-bg: #ffffff;
    --select-text: #000000;
    --num-btn-bg: #f0f0f0;
    --msg-user-bg: #f0f0f0;
    --msg-user-text: #000000;
    --msg-user-meta: #666666;
    --modal-bg: #ffffff;
    --detail-label: #000000;
    --detail-value: #000000;
    --label-text: #000000;
    --apartment-card-bg: #f0f0f0;
  }

  /* ====== Tema Escuro ====== */
  body.dark-mode {
    --card-bg: #1e2d40;
    --card-text: #e2e8f0;
    --page-bg: #0f172a;
    --input-bg: #162234;
    --input-border: #2d4460;
    --input-text: #e2e8f0;
    --input-placeholder: #64748b;
    --table-header-bg: #162234;
    --table-row-even: #1a2a3d;
    --table-row-hover: #243447;
    --table-text: #e2e8f0;
    --table-border: #2d4460;
    --select-bg: #162234;
    --select-text: #e2e8f0;
    --num-btn-bg: #243447;
    --msg-user-bg: #243447;
    --msg-user-text: #e2e8f0;
    --msg-user-meta: #94a3b8;
    --modal-bg: #1e2d40;
    --detail-label: #94a3b8;
    --detail-value: #e2e8f0;
    --label-text: #94a3b8;
    --apartment-card-bg: #162234;
  }

  /* react-datepicker no dark mode */
  body.dark-mode .react-datepicker {
    background-color: #1e2d40 !important;
    border-color: #2d4460 !important;
  }
  body.dark-mode .react-datepicker__month {
    background-color: #1e2d40 !important;
  }
  body.dark-mode .react-datepicker__day {
    color: #e2e8f0 !important;
  }
  body.dark-mode .react-datepicker__day--outside-month {
    color: #475569 !important;
  }
  body.dark-mode .react-datepicker__today-button {
    background-color: #162234 !important;
    color: #60a5fa !important;
    border-top-color: #2d4460 !important;
  }
  body.dark-mode .react-datepicker__input-container input {
    background-color: var(--input-bg) !important;
    color: var(--input-text) !important;
    border-color: var(--input-border) !important;
  }
`;
