// 1. Cole aqui a configuração do seu app Firebase
// (Encontre em Configurações do Projeto -> Seus apps -> App da Web)
export const firebaseConfig = {
  apiKey: "AIzaSyBL0W-wKIEKWnngq1wfgiqocOrdUdYeuJ4",
  authDomain: "financeiro-e6c9e.firebaseapp.com",
  projectId: "financeiro-e6c9e",
  storageBucket: "financeiro-e6c9e.firebasestorage.app",
  messagingSenderId: "1073652915131",
  appId: "1:1073652915131:web:1621491a814c202419029e"
};

// 2. Defina um ID único para seu aplicativo/restaurante. 
// ISSO NÃO É O "appId" do Firebase acima.
// É um identificador para seus dados no Firestore (ex: "meu-restaurante-123").
// Use o mesmo ID no admin.html e no cardapio.html
export const restaurantAppId = "meu-restaurante-123";