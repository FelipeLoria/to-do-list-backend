import express, { Request, Response } from "express";
import cors from "cors"
import { db } from "./database/knex";
import { serialize } from "v8";
import { type } from "os";
import { TUserDB } from "./types";

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