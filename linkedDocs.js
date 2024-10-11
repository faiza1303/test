const fs = require('fs');
const path = require('path');

function generateSQL(rule, index) {
    // Enlever le préfixe 'R' et tous les zéros suivants
    let regleValue = rule.ruleId.replace(/^R0*/, ''); // Enlève 'R' et tous les zéros qui suivent
    regleValue = regleValue.split('.')[0]; // Prend la partie entière avant le point

    let name =  rule.linkedDocs[0].name.replace(/'/g, "''");
    let link =  rule.linkedDocs[0].link;

    const insertSQL = `
        DECLARE @NewTraId${index} INT = (SELECT MAX(TRA_Id) + 1 FROM dbo.Translation);
       
        -- Insertion des traductions
        INSERT INTO Translation (TRA_Id, TRA_LanguageCode, TRA_Text)
        VALUES 
            (@NewTraId${index}, 'FR', name),
            (@NewTraId${index}, 'EN', name)

        -- Insertion de la règle
        INSERT INTO ErgoqualLinkedDocsRelationship (Regle, Regle_id)
        VALUES (
            '${regleValue}',
            '${rule.ruleId}'
            
        );
    `;

    // Vérification si linkedComponents est défini et est un tableau avant d'utiliser map
    const componentInserts = (rule.linkedComponents && Array.isArray(rule.linkedComponents)) 
        ? rule.linkedComponents.map(componentId => `
            INSERT INTO ErgoqualComponentRelationship (Regle_id, Composant_id)
            VALUES (
                '${rule.ruleId}', 
                ${componentId}
            );
        `).join('\n')
        : '';

    // Concaténation dans l'ordre souhaité
    return   insertSQL + componentInserts;
}


let index = 0; // Index pour générer des ID uniques
function processJSONFiles() {
    const directoryPath = 'C:\\Users\\BENHASFA\\Desktop\\Ergoqual-Moulinette\\Inputs\\Rules\\fr'; // Mettez le chemin vers vos fichiers JSON
     // Définir les chaînes d'ouverture et de fermeture
     const ouverture = `BEGIN TRY\n    BEGIN TRANSACTION;\n`;
     const fermeture = `    COMMIT TRANSACTION;\nEND TRY\nBEGIN CATCH\n    ROLLBACK TRANSACTION;\n    DECLARE @ErrorMessage NVARCHAR(4000);\n    DECLARE @ErrorSeverity INT;\n    DECLARE @ErrorState INT;\n\n    SELECT \n        @ErrorMessage = ERROR_MESSAGE(),\n        @ErrorSeverity = ERROR_SEVERITY(),\n        @ErrorState = ERROR_STATE();\n\n    RAISERROR (@ErrorMessage, @ErrorSeverity, @ErrorState);\nEND CATCH\n`;
 
    let allSQL = ouverture ;

    fs.readdir(directoryPath, (err, files) => {
        if (err) {
            return console.error('Unable to scan directory: ' + err);
        }

        files.forEach(file => {
            if (path.extname(file) === '.json') {
                const filePath = path.join(directoryPath, file);
                const data = fs.readFileSync(filePath, 'utf8');
                const rule = JSON.parse(data);
                allSQL += generateSQL(rule, index) + '\n';
                index++; // Incrémenter l'index pour chaque règle
            }
        });

        // Écrire les requêtes SQL dans un fichier
        fs.writeFileSync('insert_Rules_statements.sql', allSQL+ fermeture);
        console.log('SQL insert statements have been generated in insert_statements.sql');
    });
}

// Démarrer le traitement
processJSONFiles();
