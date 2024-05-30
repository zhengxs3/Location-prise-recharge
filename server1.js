const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const mqtt = require('mqtt');


/*------------------------securite--------------------------------------------------------------------------------------------------------*/


/*--------------------------------------------------------------------------------------------------------------------------------*/


const app = express();
const port = 3000;

app.use(cors());
app.use(bodyParser.json());

cors();

/************************serveur************************************************/
// Servir les fichiers statiques
app.use(express.static(path.join(__dirname, 'public')));

// Toutes les autres requêtes redirigées vers le fichier HTML
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'bienvenu.html'));
});





/******************************connection sur base données PhpMyAdmin****************************************************/

const connection = mysql.createConnection({
    host: 'localhost',
    user: 'ciel',
    password: 'ciel',
    database: 'projetRechargeTarif',
});


connection.connect((err) => {
    if (err) {
        console.error('Erreur de connexion à la base de données:', err.stack);
        return;
    }
    console.log('Connected to MySQL database');
});






/*************************Users*********************************************************************************************/

app.get('/users', (req, res) => {
    let sql = 'SELECT * FROM users';
    if (req.query.ID) {
        sql += ` WHERE ID=${req.query.ID} LIMIT 1`;
    }
    connection.query(sql, (err, results) => {
        if (err) throw err;
        res.send(results);
    });
});


app.post('/users', (req, res) => {
    let credit = 5;
    const { UID, email } = req.body;
    const query = 'INSERT INTO users (UID, email, credit) VALUES (?, ?, ?)';
    connection.query(query, [UID, email, credit], (err, result) => {
        if (err) throw err;
        res.send({ message: "Ajout avec succès", data: result });
    });

});


app.patch('/users/:UID', (req, res) => {
    const { UID } = req.params; // Access UID from URL params
    const { credit } = req.body;
    const query = 'SELECT UID FROM users WHERE UID = ?';
    connection.query(query, [UID], (err, rows) => {
        if (err) {
            console.error('Error checking existing UID:', err);
            return;
        }
        if (rows.length > 0) {
            const updateQuery = 'UPDATE users SET credit = ? WHERE UID = ?';
            connection.query(updateQuery, [credit, UID], (err, result) => {
                if (err) {
                    console.error('Erreur lors de la mise à jour:', err);
                    return;
                }
                console.log({ message: "Mise à jour avec succès", data: result });
                res.send({ message: "Mise à jour avec succès", data: result });
            });
        } else {
            console.log("Utilisateur non trouvé");
            res.status(404).send({ message: "Utilisateur non trouvé" });
        }
    });
});

app.delete('/users/:UID', (req, res) => {
    const UID = req.params.UID; 
    const deleteQuery = 'DELETE FROM users WHERE UID = ?';
    connection.query(deleteQuery, [UID], (err, result) => {
        if (err) {
            console.error('Error deleting user:', err);
            res.status(500).send({ message: "Erreur lors de la suppression de l'utilisateur" });
            return;
        }
        console.log({ message: "Utilisateur supprimé avec succès", data: result });
        res.send({ message: "Utilisateur supprimé avec succès", data: result });
    });
});



/************************mqtt et prise***********************************************************************************************************/
app.get('/prise', (req, res) => {
    let sql = 'SELECT * FROM prise';
    if (req.query.ID) {
        sql += ` WHERE ID=${req.query.ID} LIMIT 1`;
    }
    connection.query(sql, (err, results) => {
        if (err) throw err;
        res.send(results);
    });
});


// MQTT Client Setup
const server = 'mqtt://192.168.5.70:1883';

const client_btn = mqtt.connect(server);

client_btn.on('connect', () => {
    console.log('Connected to MQTT broker');
});

// Route pour activer ou désactiver le dispositif
app.post('/switch', (req, res) => {
    const { action, id } = req.body;
    if (!id) {
        res.status(400).json({ error: 'ID non spécifié' });
        return;
    }
    if (action === 'on' || action === 'off') {
        publishMessage(action, id);
        res.json({ message: `Commande ${action} envoyée avec succès à ${id}` });
    } else {
        res.status(400).json({ error: 'Action non valide' });
    }
});


function publishMessage(payload, id) {
    client_btn.publish(`${id}/command/switch:0`, payload);
}


const options = {
    client_id: "shellyplusplugs-e465b8b82e18",
    user: "xinshen",
    ssl_ca: null,
};
const client = mqtt.connect(server, options); //server = 'mqtt://192.168.5.70:1883';

client.on('connect', () => {
    console.log('Connected to MQTT broker');
    client.subscribe('#', { qos: 0 });
});

client.on('message', (topic, message) => {
    // console.log(`${topic} ${message.toString()}`);
    const id = topic.split('/')[0];
    // console.log(id)
    if (topic === `${id}/status/switch:0`) {
        const data = JSON.parse(message.toString());
        const etat = data.output;
        const consommation = data.apower;
        const total = data.aenergy.total;

        console.log(`état ${id} : ${etat}`);
        console.log(`consommation ${id} : ${consommation}`);
        console.log(`Total energie ${id} : ${total}`);
        
        information_db(id, etat, consommation, total);
    }
});

function information_db(id, etat, consommation, total) { //parametres
    const query = 'SELECT id FROM prise WHERE id = ?';
    connection.query(query, [id], (err, rows) => {
        if (err) {
            console.error('Error checking existing id:', err);
            return;
        }
        if (rows.length > 0) {
            const updateQuery = 'UPDATE prise SET etat = ?, consommation = ?, total = ? WHERE id = ?';
            connection.query(updateQuery, [etat, consommation, total, id], (err, result) => {
                if (err) {
                    console.error('Erreur lors de la mise à jour:', err);
                    return;
                }
                console.log({ message: "Mise à jour avec succès", data: result });
            });
        }else {
            const insertQuery = 'INSERT INTO prise (id, etat, consommation, total) VALUES (?, ?, ?, ?)';
            connection.query(insertQuery, [id, etat, consommation, total], (err, result) => {
                if (err) throw err;
                console.log({ message: "Ajout avec succès", data: result });
            });
        }
    });
}

app.post('/prise', (req, res) => {
    const { nomPrise, emplacement } = req.body;

    // 查询是否存在没有设置名字的插座
    const query = 'SELECT id, nomPrise FROM prise WHERE nomPrise IS NULL';
    connection.query(query, (err, rows) => {
        if (err) {
            console.error('Error checking existing prise:', err);
            res.status(500).json({ error: 'Erreur lors de la vérification de la prise existante' });
            return;
        }
        

        // 如果存在没有设置名字的插座，则插入新的插座信息
        if (rows.length > 0) {
            const updateQuery = 'UPDATE prise SET nomPrise = ?, emplacement = ? WHERE nomPrise IS NULL LIMIT 1';
            connection.query(updateQuery, [nomPrise, emplacement], (err, result) => {
                if (err) {
                    console.error('Erreur lors de la mise à jour de la prise:', err);
                    res.status(500).json({ error: 'Erreur lors de la mise à jour de la prise' });
                    return;
                }
                console.log('Prise mise à jour avec succès');
                res.status(200).json({ message: 'Prise mise à jour avec succès', data: result });
            });
        }
    });
});


app.patch('/prise/:id', (req, res) => {
    const { id } = req.params; // Access id from URL params
    const { total_debut} = req.body;
    const query = 'SELECT id FROM prise WHERE id = ?';
    connection.query(query, [id], (err, rows) => {
        if (err) {
            console.error('Error checking existing id:', err);
            return;
        }
        if (rows.length > 0) {

            const updateQuery = 'UPDATE prise SET total_debut = ? WHERE id = ?';
            connection.query(updateQuery, [total_debut, id], (err, result) => {
                if (err) {
                    console.error('Erreur lors de la mise à jour:', err);
                    return;
                }
                console.log({ message: "Mise à jour avec succès", data: result });
                res.send({ message: "Mise à jour avec succès", data: result });
            });
            
        } else {
            console.log("Utilisateur non trouvé");
            res.status(404).send({ message: "Utilisateur non trouvé" });
        }
    });
});


// 更正 DELETE 路由
app.delete('/prise/:id', (req, res) => {
    const id = req.params.id; // 获取要删除的用户的 id
    const deleteQuery = 'DELETE FROM prise WHERE id = ?';
    connection.query(deleteQuery, [id], (err, result) => {
        if (err) {
            console.error('Error deleting prise:', err);
            res.status(500).send({ message: "Erreur lors de la suppression de l'utilisateur" });
            return;
        }
        console.log({ message: "Utilisateur supprimé avec succès", data: result });
        res.send({ message: "Utilisateur supprimé avec succès", data: result });
    });
});

client.on('error', (err) => {
    console.error('Connection error:', err);
    client.end();
});

app.listen(port, () => {
    console.log(`Serveur démarré sur http://localhost:${port}`);
});
