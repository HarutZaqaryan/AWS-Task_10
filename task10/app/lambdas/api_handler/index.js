import AWS from "aws-sdk";
import { v4 as uuidv4 } from "uuid";

const cognito = new AWS.CognitoIdentityServiceProvider();
const dynamoDb = new AWS.DynamoDB.DocumentClient();

const T_tables = process.env.tables_table || "Tables000";
const T_reservations = process.env.reservations_table || "Reservations000";
const userPoolName = process.env.booking_userpool || "simple-booking-userpool000";
let userPoolID;
let userClientID;

export const handler = async (event) => {
  console.log("~~~EVENT~~~~", event);

  const httpMethod = event.httpMethod;
  const path = event.path;

  const eventBody = event.body;
  console.log("~~~event body~~~~", eventBody);

  if (path === "/signup" && httpMethod === "POST") {
    console.log("~~~inside 1~~~~");
    return await signupHandler(eventBody);
  } else if (path === "/signin" && httpMethod === "POST") {
    console.log("~~~inside 2~~~~");
    return await signinHandler(eventBody);
  } else if (path === "/tables" && httpMethod === "POST") {
    console.log("~~~inside 3~~~~");
    return await createTableHandler(eventBody);
  } else if (path === "/tables" && httpMethod === "GET") {
    console.log("~~~inside 4~~~~");
    return await getTablesHandler(eventBody);
  } else if (path === "/reservations" && httpMethod === "POST") {
    console.log("~~~inside 5~~~~");
    return await createReservationHandler(eventBody);
  } else if (path && path.startsWith("/tables/") && httpMethod === "GET") {
    console.log("~~~inside 6~~~~");
    return await getTableByIdHandler(event);
  } else if (path === "/reservations" && httpMethod === "GET") {
    console.log("~~~inside 7~~~~");
    return await getReservationsHandler(eventBody);
  } else {
    console.log("~~~inside 8~~~~");
    return {
      statusCode: 400,
      body: JSON.stringify({ message: "Invalid request" }),
    };
  }
};

const getuserPoolNameByName = async (userPoolName) => {
  try {
    const params = {
      MaxResults: 60,
    };
    const response = await cognito.listUserPools(params).promise();
    const userPool = response.UserPools.find(
      (pool) => pool.Name === userPoolName
    );

    if (userPool) {
      return userPool.Id;
    } else {
      throw new Error(`User pool with name ${userPoolName} not found`);
    }
  } catch (error) {
    console.error("Error fetching User Pool ID:", error);
    throw error;
  }
};

const getClientId = async () => {
  try {
    const params = {
      UserPoolId: userPoolID,
      MaxResults: 60,
    };

    const response = await cognito.listUserPoolClients(params).promise();
    const client = response.UserPoolClients[0];

    if (client) {
      return client.ClientId;
    } else {
      throw new Error("No Client ID found");
    }
  } catch (error) {
    console.error("Error fetching Client ID:", error);
    throw error;
  }
};

// /signup POST
const signupHandler = async (event) => {
  const eventObj = JSON.parse(event);
  if (!userPoolID) {
    userPoolID = await getuserPoolNameByName(userPoolName);
  }

  const params = {
    UserPoolId: userPoolID,
    Username: eventObj.email,
    UserAttributes: [
      { Name: "custom:firstName", Value: eventObj.firstName },
      { Name: "custom:lastName", Value: eventObj.lastName },
      { Name: "email", Value: eventObj.email },
    ],
    MessageAction: "SUPPRESS",
    TemporaryPassword: eventObj.password,
  };

  try {
    const req = await cognito.adminCreateUser(params).promise();
    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Sign-up process is successful" }),
    };
  } catch (error) {
    console.log("We are in catch block(signupHandler)", error.message);
    return {
      statusCode: 400,
      body: JSON.stringify({ message: error.message }),
    };
  }
};

// /signin POST
const signinHandler = async (event) => {
  const eventObj = JSON.parse(event);

  if (!userClientID) {
    userClientID = await getClientId();
  }
  if (!userPoolID) {
    userPoolID = await getuserPoolNameByName(userPoolName);
  }

  const params = {
    AuthFlow: "USER_PASSWORD_AUTH",
    ClientId: userClientID,
    AuthParameters: {
      USERNAME: eventObj.email,
      PASSWORD: eventObj.password,
    },
  };

  try {
    const response = await cognito.initiateAuth(params).promise();
    if (response.ChallengeName === "NEW_PASSWORD_REQUIRED") {
      const newPassword = eventObj.password;

      const challengeResponses = {
        USERNAME: eventObj.email,
        NEW_PASSWORD: newPassword,
      };

      const challengeParams = {
        ClientId: userClientID,
        ChallengeName: response.ChallengeName,
        Session: response.Session,
        ChallengeResponses: challengeResponses,
      };

      const challengeResponse = await cognito
        .respondToAuthChallenge(challengeParams)
        .promise();
      return {
        statusCode: 200,
        body: JSON.stringify({
          accessToken: challengeResponse.AuthenticationResult.AccessToken,
        }),
      };
    } else {
      return {
        statusCode: 200,
        body: JSON.stringify({
          accessToken: response.AuthenticationResult.IdToken,
        }),
      };
    }
  } catch (error) {
    console.log("We are in catch block(signinHandler)", error.message);

    return {
      statusCode: 400,
      body: JSON.stringify({ message: error.message }),
    };
  }
};

// /tables GET
const getTablesHandler = async (event) => {

  const params = {
    TableName: T_tables,
  };
  try {

    const data = await dynamoDb.scan(params).promise();
    return {
      statusCode: 200,
      body: JSON.stringify({ tables: data.Items }),
    };
  } catch (error) {
    console.log("getTablesHandler catch block", error.message);

    return {
      statusCode: 400,
      body: JSON.stringify({ message: error.message }),
    };
  }
};

// /tables POST
const createTableHandler = async (event) => {
  const eventObj = JSON.parse(event);

  const params = {
    TableName: T_tables,
    Item: {
      id: +eventObj.id || uuidv4(),
      number: +eventObj.number,
      places: +eventObj.places,
      isVip: eventObj.isVip,
      minOrder: eventObj.minOrder,
    },
  };

  try {
    const data = await dynamoDb.put(params).promise();
    return {
      statusCode: 200,
      body: JSON.stringify({ id: +params.Item.id }),
    };
  } catch (error) {
    console.log("~~~We are in catch block(createTableHandler)", error.message);
    return {
      statusCode: 400,
      body: JSON.stringify({ message: error.message }),
    };
  }
};

// /tables/{tableId} GET
const getTableByIdHandler = async (event) => {
  const tableId = event.path.split("/")[2];
  const params = {
    TableName: T_tables,
    Key: {
      id: +tableId,
    },
  };

  try {
    const data = await dynamoDb.get(params).promise();
    return {
      statusCode: 200,
      body: JSON.stringify(data.Item),
    };
  } catch (error) {
    console.log("~~~We are in catch block(getbyhandler)", error.message);
    return {
      statusCode: 400,
      body: JSON.stringify({ message: error.message }),
    };
  }
};

// /reservations POST (my code)
// const createReservationHandler = async (event) => {
//   console.log("We in createReservationHandler, event is - ", event);
//   const eventObj = JSON.parse(event);

//   const params = {
//     TableName: T_reservations,
//     Item: {
//       id: uuidv4(),
//       tableNumber: eventObj.tableNumber,
//       clientName: eventObj.clientName,
//       phoneNumber: eventObj.phoneNumber,
//       date: eventObj.date,
//       slotTimeStart: eventObj.slotTimeStart,
//       slotTimeEnd: eventObj.slotTimeEnd,
//     },
//   };
//   console.log("~~~reservations post params~~~~", params);

//   try {
//     console.log("~~~We are in try block(createReserv)");

//     await dynamoDb.put(params).promise();
//     return {
//       statusCode: 200,
//       body: JSON.stringify({ reservationId: params.Item.id }),
//     };
//   } catch (error) {
//     console.log("~~~We are in catch block(createReserv)", error.message);

//     return {
//       statusCode: 400,
//       body: JSON.stringify({ message: error.message }),
//     };
//   }
// };

// Copilot code
const createReservationHandler = async (event) => {
  console.log("We in createReservationHandler, event is - ", event);
  const eventObj = JSON.parse(event);

  // Check if the table exists
  const tableParams = {
    TableName: T_tables,
    Key: {
      id: eventObj.tableNumber,
    },
  };

  try {
    const tableData = await dynamoDb.get(tableParams).promise();
    console.log("~~~Table Data~~~", tableData);
    if (!tableData.Item) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Table does not exist" }),
      };
    }

    // Check for overlapping reservations
    const reservationParams = {
      TableName: T_reservations,
      KeyConditionExpression: "tableNumber = :tableNumber AND #date = :date",
      ExpressionAttributeNames: {
        "#date": "date",
      },
      ExpressionAttributeValues: {
        ":tableNumber": eventObj.tableNumber,
        ":date": eventObj.date,
      },
    };
    console.log("~~~Reservation Params", reservationParams);

    const reservationData = await dynamoDb.query(reservationParams).promise();
    console.log("~~~Reservation Date", reservationData);

    const reservations = reservationData.Items;

    for (const reservation of reservations) {
      if (
        eventObj.slotTimeStart < reservation.slotTimeEnd &&
        eventObj.slotTimeEnd > reservation.slotTimeStart
      ) {
        return {
          statusCode: 400,
          body: JSON.stringify({
            message: "Reservation time overlaps with an existing reservation",
          }),
        };
      }
    }

    // Create the reservation
    const params = {
      TableName: T_reservations,
      Item: {
        id: uuidv4(),
        tableNumber: eventObj.tableNumber,
        clientName: eventObj.clientName,
        phoneNumber: eventObj.phoneNumber,
        date: eventObj.date,
        slotTimeStart: eventObj.slotTimeStart,
        slotTimeEnd: eventObj.slotTimeEnd,
      },
    };

    await dynamoDb.put(params).promise();
    return {
      statusCode: 200,
      body: JSON.stringify({ reservationId: params.Item.id }),
    };
  }  catch (error) {
    console.log("~~~We are in catch block(createReserv)", error.message);
    return {
      statusCode: 400,
      body: JSON.stringify({ message: error.message }),
    };
  }
};

// /reservations GET
const getReservationsHandler = async (event) => {
  console.log("We in getReservationsHandler, event is - ", event);

  const params = {
    TableName: T_reservations,
  };
  console.log("~~~reservations get params~~~~", params);

  try {
    console.log("~~~We are in try block(getReserv)");

    const data = await dynamoDb.scan(params).promise();
    console.log("~~~data from getReserv", data);
    return {
      statusCode: 200,
      body: JSON.stringify({ reservations: data.Items }),
    };
  } catch (error) {
    console.log("~~~We are in catch block(getReserv)", error.message);

    return {
      statusCode: 400,
      body: JSON.stringify({ message: error.message }),
    };
  }
};
