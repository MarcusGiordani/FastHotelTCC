// src/styles/global.ts
import { createGlobalStyle } from 'styled-components';
// Não precisamos importar colors aqui, pois o background principal será no componente Login

export const GlobalStyle = createGlobalStyle`
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  html, body, #root {
    height: 100%; /* Garante que body e root ocupem 100% da altura para centralização */
  }

  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
      'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
      sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  /* Removido o display flex e justify-content do #root aqui para que o Login container gerencie isso */
`;