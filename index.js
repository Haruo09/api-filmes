/** ROTAS:
 * GET /filmes/:pagina -> Lista todos os filmes da página selecionada;                                                  [✓]
 * GET /filme/:id -> Mostra as informações do filme de ID selecionado;                                                  [✓]
 * GET /filmes/busca/:palavra -> Retorna os filmes que satisfazem a busca, junto de todas as suas informações;          [✓]
 * GET /generos/:genero -> Retorna todos os filmes de um determinado gênero;                                            [✓]
 * GET /ator/:id -> Retorna o nome do ator e todos os filmes que ele fez;                                               [✓]
 * GET /atores/busca/:palavra -> Retorna um JSON com todos os atores que satisfazem a busca e seus filmes;              [✓]
 * POST /atores -> Em caso de sucesso, retorna o ID do ator adicionado. Caso contrário, retorna uma mensagem de erro;   [✓]
 * POST /participacoes/:idAtor/:idFilme -> Cadastra uma participação em um filme de um ator informado;                  
 * PUT /atores -> Edita o nome de um ator existente, informado através de seu id;                                       
 * DELETE /atores/:id -> Remove o ator com id informado, além de todos os filmes que ele participou.                    
 * DELETE /participacoes/:idAtor/:idFilme -> Remove uma participação em um filme de um ator informado.                  
*/ 

import express, { json } from "express";
import cors from "cors";
import mysql from "serverless-mysql";
import path from "path";
import { error } from "console";

const port = 3000;

const app = express();
app.use(cors());
app.use(json());

const db = mysql({
    config: {
        host      : "127.0.0.1",
        database  : "iftm_filmes",
        user      : "root",
        password  : "",
    }
});

// app.get("/filmes", async (req, res) => {
//     const filmes = await db.query("SELECT * from FILMES");
//     res.send(filmes);
// });

app.get("/filmes/:pagina", async (req, res) => {
    try {
        const pagina = req.params.pagina;
        const filmes = await db.query(
            "SELECT filmes.* FROM filmes ORDER BY filmes.nota DESC LIMIT ?, 10;",
            [(pagina - 1) * 10]
        );

        if (filmes.length === 0) {
            res.status(404).send({"error_msg": "404: Página não encontrada."});
            return;
        }

        for (const filme of filmes) {
            
            filme['atores'] = (await db.query(
                "SELECT atores.titulo AS nome_ator FROM atores " +
                "INNER JOIN atores_filmes ON atores.id = atores_filmes.ator_id " +
                "INNER JOIN filmes ON atores_filmes.filme_id = filmes.id " +
                "WHERE filmes.id = ? " +
                "ORDER BY atores.titulo ASC;",
                [filme["id"]]
            )).map(ator => ator['nome_ator']);

            filme['generos'] = (await db.query(
                "SELECT generos.titulo AS genero FROM generos " +
                "INNER JOIN filmes_generos ON generos.id = filmes_generos.genero_id " +
                "INNER JOIN filmes ON filmes_generos.filme_id = filmes.id " +
                "WHERE filmes.id = ? " +
                "ORDER BY generos.titulo ASC;",
                [filme["id"]]
            )).map(genero => genero['genero']);
        }

        res.send(filmes);
    } 
    
    catch (error) {
        // res.send({"error_msg": "Página não encontrada."});
        res.send({"error_msg": error});
        console.log(error);
        
    }
});

app.get("/filme/:id", async (req, res) => {
    try {
        const id = req.params.id;

        const filme = (await db.query(
            "SELECT filmes.* from filmes WHERE filmes.id = ?",
            [id]
        ));

        if (filme.length === 0) {
            res.status(404).send({"error_msg": "404: Filme com ID especificado não encontrado."});
            return;
        }

        filme[0]["atores"] = (await db.query(
            "SELECT atores.titulo as nome_ator FROM atores " +
            "INNER JOIN atores_filmes ON atores.id = atores_filmes.ator_id " +
            "INNER JOIN filmes ON atores_filmes.filme_id = filmes.id " +
            "WHERE filmes.id = ? " +
            "ORDER BY atores.titulo ASC;",
            [id]
        )).map(ator => ator["nome_ator"]);

        filme[0]["generos"] = (await db.query(
            "SELECT generos.titulo as genero FROM generos " +
            "INNER JOIN filmes_generos ON generos.id = filmes_generos.genero_id " +
            "INNER JOIN filmes ON filmes_generos.filme_id = filmes.id " +
            "WHERE filmes.id = ? " +
            "ORDER BY generos.titulo ASC;",
            [id]
        )).map(genero => genero["genero"]);

        res.send(filme[0]);
    }
    
    catch (error) {
        res.send({"error_msg": error});
        console.log(error);
    }
});

app.get("/filmes/busca/:palavra", async (req, res) => {
    const palavra = req.params.palavra;

    try {
        const filmes = await db.query(
            "SELECT * FROM filmes WHERE filmes.titulo LIKE ? ORDER BY filmes.nota DESC;",
            [`%${palavra}%`]
        );

        if (filmes.length === 0) {
            res.status(404).send({"error_msg": "Nenhum resultado para sua busca."});
            // return;
        }
        
        for (const filme of filmes) {
            
            filme['atores'] = (await db.query(
                "SELECT atores.titulo as nome_ator FROM atores " +
                "INNER JOIN atores_filmes ON atores.id = atores_filmes.ator_id " +
                "INNER JOIN filmes ON atores_filmes.filme_id = filmes.id " +
                "WHERE filmes.id = ? " +
                "ORDER BY atores.titulo ASC;",
                [filme['id']]
            )).map(ator => ator["nome_ator"]);

            filme['generos'] = (await db.query(
                "SELECT generos.titulo as genero FROM generos " +
                "INNER JOIN filmes_generos ON generos.id = filmes_generos.genero_id " +
                "INNER JOIN filmes ON filmes_generos.filme_id = filmes.id " +
                "WHERE filmes.id = ? " +
                "ORDER BY generos.titulo ASC;",
                [filme['id']]
            )).map(genero => genero["genero"]);
        }
        
        res.send(filmes);
    }

    catch (error) {
        res.send({"error_msg": error});
    }
    
});

app.get("/ator/:id", async (req, res) => {
    try {
        const id = req.params.id;

        const ator = await db.query(
            "SELECT atores.titulo AS nome_ator FROM atores WHERE atores.id = ?",
            [id]
        );

        if (ator.length === 0) {
            res.status(404).send({"msg": "ID do ator não encontrado."});
            return;
        }

        ator[0]["filmes"] = (await db.query(
            "SELECT filmes.titulo FROM filmes " +
            "INNER JOIN atores_filmes ON filmes.id = atores_filmes.filme_id " +
            "INNER JOIN atores ON atores_filmes.ator_id = atores.id " +
            "WHERE atores.id = ?;",
            [id]
        )).map(filme => filme["titulo"]);
    
        res.send(ator[0]);
    } 
    
    catch (error) {        
        res.send({"error_msg": "Algo deu errado. Tente novamente mais tarde."});
        console.log(error);
    }
});

app.get("/atores/busca/:palavra", async (req, res) => {
    const palavra = req.params.palavra;

    try {
        const atores = await db.query(
            "SELECT atores.id, atores.titulo as nome_ator FROM atores WHERE atores.titulo LIKE ?;",
            [`%${palavra}%`]
        );

        if (atores.length === 0) {
            res.status(404).send({"msg": "Nenhum ator encontrado na busca."});
            return;
        }

        for (const ator of atores) {
            ator["filmes"] = (await db.query(
                // "SELECT filmes.id as id_filme, filmes.titulo, filmes.ano, filmes.duracao, filmes.sinopse, filmes.poster, filmes.nota, filmes.votos, filmes.imdb_id FROM filmes " +
                "SELECT filmes.titulo AS filme FROM filmes " +
                "INNER JOIN atores_filmes ON filmes.id = atores_filmes.filme_id " +
                "INNER JOIN atores ON atores_filmes.ator_id = atores.id " +
                "WHERE atores.id = ?;",
                [ator["id"]]
            )).map(filme => filme["filme"]);
        }

        res.send(atores);
    }

    catch (error) {
        res.send({"error_msg": "Algo deu errado. Tente novamente mais tarde. (Consulte o Console para mais informações.)"});
        console.log(error);
    }
});

app.get("/generos/:genero", async (req, res) => {
    try {
        const genero = req.params.genero;
        
        const filmes = (await db.query(
            "SELECT filmes.titulo FROM filmes " +
            "INNER JOIN filmes_generos ON filmes.id = filmes_generos.filme_id " +
            "INNER JOIN generos ON filmes_generos.genero_id = generos.id " +
            "WHERE generos.titulo = ?;",
            [genero]
        )).map(filme => filme["titulo"]);

        if (filmes.length === 0) {
            res.status(404).send({"error_msg": "404: Gênero pesquisado não existe."});
            return;
        }
        
        res.send({
            "genero": genero,
            "filmes": filmes
        });
    } 
    
    catch (error) {
        // res.send({"error_msg": "Algo deu errado. Tente novamente mais tarde."});
        res.send({"error_msg": error});
    }
});

app.post("/atores", async (req, res) => {
    const nome_ator = req.body.titulo;
    try {
        const result = await db.query(
            "INSERT INTO atores (titulo) VALUES " +
            "(?);",
            [nome_ator]
        );

        // const id = await db.query("SELECT atores.id FROM atores WHERE atores.titulo = ?;", [nome_ator]);

        res.send({
            "msg": "Ator adicionado com sucesso!",
            "id_adicionado": result['insertId']
            // "id_adicionado": id[0]["id"]
        });
    } 
    
    catch (error) {
        res.send({"error_msg": "Não foi possível adicionar o ator."});
        console.log(error);
    }
    
});

app.post("/participacoes/:idAtor/:idFilme", async (req, res) => {
    const idAtor = req.params.idAtor;
    const idFilme = req.params.idFilme;

    const result = await db.query(
        "INSERT INTO atores_filmes (ator_id, filme_id) VALUES " +
        "(?, ?)",
        [idAtor, idFilme]
    );

    res.send({
        "msg": "Participação adicionada com sucesso!",
        "id_adicionado": result['insertId']
        // "id_adicionado": id[0]["id"]
    });
});

app.put("/atores", async (req, res) => {
    try {
        const id = req.body.id;
        const novoNome = req.body.titulo;
    
        const result = await db.query(
            "UPDATE atores " +
            "SET atores.titulo = ? " +
            "WHERE atores.id = ?;",
            [novoNome, id]
        );

        if (result["affectedRows"] === 0) {
            res.status(404).send({"error_msg": "404: ID informado não encontrado para modificação."});
            return;
        }
    
        res.send({"msg": `ID ${id} alterado com sucesso!`});
    } 
    
    catch (error) {
        res.send({"error_msg": "Algo deu errado. Tente novamente mais tarde."});
        console.log(error);
    }
})

app.delete("/atores/:id", async (req, res) => {
    const id = req.params.id;

    try {
        // 1. remover os itens da tabela 'atores_filmes';
        await db.query(
            "DELETE FROM atores_filmes " +
            "WHERE atores_filmes.ator_id = ?;",
            [id]
        );
        
        // 2. remover o ator da tabela 'atores';
        const result = await db.query(
            "DELETE FROM atores " +
            "WHERE atores.id = ?;",
            [id]
        );

        // 3. Verificar se o item foi removido:
        if (result["affectedRows"] == 0) {
            res.status(404).send({ "error_msg": "ID não encontrado para remoção."});
            return;
        }

        res.send({ "msg": "Ator removido com sucesso!", "id_removido": id });
        
    }

    catch (error) {
        res.send({"error_msg": error});
    }
});

app.delete("/participacoes/:idAtor/:idFilme", async (req, res) => {
    const idAtor = req.params.idAtor;
    const idFilme = req.params.idFilme;

    const tupla = (await db.query(
        "SELECT * FROM atores_filmes WHERE atores_filmes.ator_id = ? AND atores_filmes.filme_id = ?;",
        [idAtor, idFilme]
    ));

    if (tupla.length === 0) {
        res.status(404).send({"error_msg": "Tupla não encontrada para remoção."});
        return;
    }

    const idTupla = tupla[0]['id'];

    const result = await db.query(
        "DELETE FROM atores_filmes " +
        "WHERE atores_filmes.id = ? ",
        [idTupla]
    );

    if (result['affectedRows'] === 0) {
        res.send({"error_msg": "Algo deu errado."});
        return;
    }

    res.send({"msg": "Participação removida com sucesso!", "id_removido": idTupla});
});

app.listen(port, () => {
    console.log(`Servidor rodando em http://127.0.0.1:3000`);
});
