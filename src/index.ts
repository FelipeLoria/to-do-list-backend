import express, { Request, Response } from "express";
import cors from "cors"
import { db } from "./database/knex";
import { serialize } from "v8";
import { type } from "os";
import { TUserDB, TTaskDB } from "./types";
import { stat } from "fs";

const app = express()

app.use(cors())
app.use(express.json())

app.listen(3003, ()=>{
    console.log(`Servidor rodando na porta ${3003}`)
})

app.get('/ping',async (req:Request, res:Response) => {
    try {
        res.status(200).send({message: "Pong",})
    } catch (error) {
        console.log(error)

        if (req.statusCode === 200) {
            res.status(500)
        }

        if (error instanceof Error) {
            res.send(error.message)
        } else {
            res.send("Error inesperado")
        }
    }
})

app.get('/users', async (req:Request, res:Response) => {
    try {
        const searchTerm = req.query.q as string | undefined

        if (searchTerm === undefined) {
            const result = await db("users")
            res.status(200).send(result)
        } else {
            const result = await db("users").where("name", "LIKE", `%${searchTerm}%`)
            res.status(200).send(result)
        }

    } catch (error) {
        console.log(error)

        if (req.statusCode === 200) {
            res.status(500)
        }

        if (error instanceof Error) {
            res.send(error.message)
        } else {
            res.send("Error inesperado")
        }
    }
})

app.post("/users", async (req:Request, res:Response)=>{
    try {
        
        const {id, name, email, password} = req.body

        if (typeof id !== "string" || typeof name !== "string" || typeof email !== "string" || typeof password !== "string") {
            res.status(400)
            throw new Error ("Os dados preenchidos devem ser strings")
        }

        if (id.length < 4 || name.length < 2) {
            res.status(400)
            throw new Error ("'id' deve possuir pelo menos 4 caracteres \n 'name' deve possuir pelo menos 2 caracteres")
        }

        if (!email.match(/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/g)) {
			throw new Error("'password' deve possuir entre 8 e 12 caracteres, com letras maiúsculas e minúsculas e no mínimo um número e um caractere especial")
		}

        if (!password.match(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\da-zA-Z]).{8,12}$/g)) {
			throw new Error("'password' deve possuir entre 8 e 12 caracteres, com letras maiúsculas e minúsculas e no mínimo um número e um caractere especial")
		}

        const [userIdAlreadyExist]: TUserDB[] | undefined[] =  await db("users").where({id})

        if (userIdAlreadyExist) {
            res.status(400)
            throw new Error ("'id' já existente")
        }

        const [useremailAlreadyExist]: TUserDB[] | undefined[] =  await db("users").where({email})

        if (useremailAlreadyExist) {
            res.status(400)
            throw new Error ("'email' já existente")
        }

        const newUser: TUserDB = {
            id,
            name,
            email,
            password
        }

        await db("users").insert(newUser)
        res.status(201).send({message: "User criado com sucesso", 
        user: newUser})

    } catch (error) {
        console.log(error)

        if (req.statusCode === 200) {
            res.status(500)
        }

        if (error instanceof Error) {
            res.send(error.message)
        } else {
            res.send("Error inesperado")
        }
    }
})

app.delete("/users/:id", async (req:Request, res:Response)=>{
    try {
        
        const idToDelete = req.params.id

        if (idToDelete[0] !== "f") {
            res.status(400)
            throw new Error ("'id' deve iniciar com a letra 'f'")
        }

        const [userIdAlredyExists]: TUserDB[] | undefined[] = await db("users").where({ id: idToDelete })

        if (!userIdAlredyExists) {
            res.status(404)
            throw new Error ("'id' não encontrado")
        }

        await db("users").del().where({ id: idToDelete })
        res.status(200).send({ message: "User deletado com sucesso" })

    } catch (error) {
        console.log(error)

        if (req.statusCode === 200) {
            res.status(500)
        }

        if (error instanceof Error) {
            res.send(error.message)
        } else {
            res.send("Error inesperado")
        }
    }
})

app.get('/tasks', async (req:Request, res:Response) => {
    try {
        const searchTerm = req.query.q as string | undefined

        if (searchTerm === undefined) {
            const result = await db("tasks")
            res.status(200).send(result)
        } else {
            const result = await db("tasks")
            .where("title", "LIKE", `%${searchTerm}%`)
            .orWhere("description", "LIKE", `%${searchTerm}%`)
            res.status(200).send(result)
        }

    } catch (error) {
        console.log(error)

        if (req.statusCode === 200) {
            res.status(500)
        }

        if (error instanceof Error) {
            res.send(error.message)
        } else {
            res.send("Error inesperado")
        }
    }
})

app.post("/tasks", async (req:Request, res:Response)=>{
    try {
        
        const {id, title, description} = req.body

        if (typeof id !== "string" || typeof title !== "string" || typeof description !== "string") {
            res.status(400)
            throw new Error ("Os dados preenchidos devem ser strings")
        }

        if (id.length < 4 || title.length < 2) {
            res.status(400)
            throw new Error ("'id' deve possuir pelo menos 4 caracteres \n 'title' deve possuir pelo menos 2 caracteres")
        }

        const [taskIdAlreadyExist]: TTaskDB[] | undefined[] =  await db("tasks").where({id})

        if (taskIdAlreadyExist) {
            res.status(400)
            throw new Error ("'id' já existente")
        }

        const newTask = {
            id,
            title,
            description
        }

        await db("tasks").insert(newTask)

        const [insertedTaks] = await db("Tasks").where({ id })

        res.status(201).send({message: "Taks criado com sucesso", 
        task: insertedTaks})

    } catch (error) {
        console.log(error)

        if (req.statusCode === 200) {
            res.status(500)
        }

        if (error instanceof Error) {
            res.send(error.message)
        } else {
            res.send("Error inesperado")
        }
    }
})

app.put("/tasks/:id", async (req:Request, res:Response)=>{
    try {
        
        const idToEdit = req.params.id

        const newId = req.body.id
        const newtitle = req.body.title
        const newDescription = req.body.description
        const newCreatedAt = req.body.createdAt
        const newStatus = req.body.status

        if (newId !== undefined) {
            if (typeof newId !== "string" ) {
                res.status(400)
                throw new Error ("'id' deve ser string")
            }
    
            if (newId.length < 4) {
                res.status(400)
                throw new Error ("'id' deve possuir pelo menos 4 caracteres")
            }
        }

        if (newtitle !== undefined){
            if (typeof newtitle !== "string") {
                res.status(400)
                throw new Error ("'title' deve ser string")
            }
    
            if (newtitle.length < 2) {
                res.status(400)
                throw new Error ("'title' deve possuir pelo menos 2 caracteres")
            }
        }

        if (newDescription !== undefined) {
            if (typeof newDescription !== "string") {
                res.status(400)
                throw new Error ("'description' deve ser string")
            }
        }

        if (newCreatedAt !== undefined) {
            if (typeof newCreatedAt !== "string") {
                res.status(400)
                throw new Error ("'created_at' deve ser string")
            }
        }

        if (newStatus !== undefined) {
            if (typeof newStatus !== "number")
            res.status(400)
            throw new Error ("'status' deve ser number (0 ou 1)")
        }

        const [task]: TTaskDB[] | undefined[] =  await db("tasks").where({id: idToEdit})

        if (!task) {
            res.status(404)
            throw new Error ("'id' não encontrado")
        }

        const newTask: TTaskDB = {
            id: newId || task.id,
            title: newtitle || task.title,
            description: newDescription || task.description,
            created_at: newCreatedAt || task.created_at,
            status: isNaN(newStatus) ? task.status : newStatus
        }

        await db("tasks").update(newTask).where({ id: idToEdit})

        res.status(200).send({message: "Taks editada com sucesso", 
        task: newTask})

    } catch (error) {
        console.log(error)

        if (req.statusCode === 200) {
            res.status(500)
        }

        if (error instanceof Error) {
            res.send(error.message)
        } else {
            res.send("Error inesperado")
        }
    }
})

app.delete("/tasks/:id", async (req:Request, res:Response)=>{
    try {
        
        const idToDelete = req.params.id

        if (idToDelete[0] !== "t") {
            res.status(400)
            throw new Error ("'id' deve iniciar com a letra 't'")
        }

        const [taskIdToDelete]: TTaskDB[] | undefined[] = await db("tasks").where({ id: idToDelete })

        if (!taskIdToDelete) {
            res.status(404)
            throw new Error ("'id' não encontrado")
        }

        await db("tasks").del().where({ id: idToDelete })
        res.status(200).send({ message: "Task deletado com sucesso" })

    } catch (error) {
        console.log(error)

        if (req.statusCode === 200) {
            res.status(500)
        }

        if (error instanceof Error) {
            res.send(error.message)
        } else {
            res.send("Error inesperado")
        }
    }
})