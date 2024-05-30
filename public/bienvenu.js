// configuration de notre base de données avec le site web
const firebaseConfig = {
    apiKey: "AIzaSyAo9d7pb7sf3PuSWDWYtSrdMEx9mjUfAVg",
    authDomain: "rechargehub-94a85.firebaseapp.com",
    databaseURL: "https://rechargehub-94a85-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "rechargehub-94a85",
    storageBucket: "rechargehub-94a85.appspot.com",
    messagingSenderId: "540530082373",
    appId: "1:540530082373:web:e77f9e3cf80b88d136192c",
    measurementId: "G-25WBJEQWFR"
};
const firebaseApp = firebase.initializeApp(firebaseConfig);

const db = firebaseApp.firestore();
const auth = firebaseApp.auth();


// Sign in function
const signIn = () => {
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    const errorMessage = document.getElementById("error-message");

    // Authentification avec Firebase
    firebase.auth().signInWithEmailAndPassword(email, password)
        .then((userCredential) => {
            // Récupération de l'utilisateur connecté
            const user = userCredential.user;
            console.log(`User's UID : ${user.uid}`);
            console.log(`User's e-mail : ${user.email}`);


            fetch('http://192.168.5.70:3000/users') //URL OU ENDPOINT
                .then(response => response.json())
                .then(data => {
                    console.log(data);

                    // Vérification de l'existence de l'utilisateur dans les données récupérées
                    const userExists = data.some(userData => userData.UID === user.uid);

                    if (!userExists) {
                        // Si l'utilisateur n'existe pas dans la liste, l'ajouter
                        const formData = new URLSearchParams();
                        formData.append('UID', user.uid);
                        formData.append('email', user.email);

                        fetch('http://192.168.5.70:3000/users', {
                            method: 'POST',
                            body: JSON.stringify(Object.fromEntries(formData)),
                            headers: {
                                'Content-Type': 'application/json'
                            }
                        })
                        .then(response => response.json())
                        .then(data => console.log(data))
                        .catch(error => console.error('Error:', error));
                        

                    } else {
                        console.log("L'utilisateur existe déjà dans la base de données.");

                        const userData = {
                            username: user.email,
                            UID: user.uid,
                            // Other user information
                        };
                        
                        // console.log(userData)

                        // Store user data in session storage
                        try {
                            sessionStorage.setItem('userData', JSON.stringify(userData));
                            console.log('User data stored successfully:', userData);
                        } catch (error) {
                            console.error('Error storing user data:', error);
                        }

                        location.href = 'p2 copy.html'
                    }
                })
                .catch(error => console.error('Error:', error));

                      
            
            
        })
        .catch((error) => {
            console.log(error.code);
            console.log(error.message);
            // Afficher le message d'erreur
            errorMessage.innerText = "Adresse e-mail ou mot de passe invalide";
        });
}

