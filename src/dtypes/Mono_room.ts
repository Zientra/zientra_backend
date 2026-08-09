import { WebSocket } from "ws";

// This is proto/structure of single room 
// Multiple rooms exist -> Checkout index.ts

export class mono_room{

    // v1 : vars not confirmed

    id: string;
    name: string;

    members: WebSocket[];  // user IDs
    agents: string[];   // agent IDs

    messages: string[]; // message IDs
    tasks: string[];    // task IDs

    repositoryId?: string;
    workspaceId?: string;
  
    constructor(Id : string, name:string, mem:WebSocket[], ag : string[], msg : string[], ts : string[]){
        this.id = Id;
        this.name = name;   
        this.members = mem;
        this.agents = ag;
        this.messages = msg;
        this.tasks = ts;
    }

    add_user(user_Id: WebSocket){
        if(!this.members){
            this.members = [];
        }


        try{
            this.members.push(user_Id);
        }
        catch(err){
            console.log(err);
        }
    }
}
