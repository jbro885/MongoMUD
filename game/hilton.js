rooms = []

rheinlandernorth = { _id: "rheinlandernorth",
   ld: "You are stranding at the north end of the Rhinelander Gallery, It's been transformed into the Leaf Lounge by MongoDB",
   ex: { s: "rhinelandercenter", e: "promenadewest" }
}

rooms.push(rheinlandernorth)


rheinlandercenter = { _id: "rheinlandercenter",
   ld: "You are stranding in the centre Rhinelander Gallery, It's full of exhibits about MongoDB",
   ex: { n: "rheinlandernorth", e: "guestwest" }
}

rooms.push(rheinlandercenter)


rheinlandercenter = { _id: "rheinlandercenter",
   ld: "You are stranding in the centre Rhinelander Gallery, It's full of exhibits about MongoDB",
   ex: { n: "rheinlandernorth", e: "guestwest" }
}

rooms.push(rheinlandercenter)
