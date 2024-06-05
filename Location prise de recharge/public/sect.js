const resultat = document.getElementById("resultat");

fetch('http://localhost:3000/prise')
    .then(response => {
        if (!response.ok) {
            throw new Error('Erreur réseau lors de la récupération des données.');
        }
        return response.json();
    })
    .then(data => {
        // 添加新的选项到 <select> 元素中
        data.forEach(item => {
            let newOption = document.createElement('option');
            newOption.textContent = item.nomPrise;
            newOption.value = item.id; // 设置选项的值为每个元素的 ID，方便后续使用
            prise.appendChild(newOption);

        });

    })
    .catch(error => {
        console.error('Il y a eu un problème avec l\'opération fetch:', error.message);
    });


resultat.appendChild(newOption);