import AWS from "aws-sdk";
import { v4 as uuidv4 } from "uuid";

const cognito = new AWS.CognitoIdentityServiceProvider();
const dynamoDb = new AWS.DynamoDB.DocumentClient();

const T_tables = process.env.tables_table || "Tables";
const T_reservations = process.env.reservations_table || "Reservations";
const userPoolId = process.env.booking_userpool || "simple-booking-userpool";

export const handler = async (event) => {
  console.log("~~~EVENT~~~~", event);
  const httpMethod = event.requestContext.http.method;
  console.log("~~~httpMethod~~~~", httpMethod);
  const path = event.requestContext.http.path;
  console.log("~~~path~~~~", path);
  const eventBody = JSON.parse(event.body.trim().replace(/\\r\\n|\\n|\\r/g, '').replace(/\\"/g, '"').replace(/\s{2,}/g, ' '));
  console.log("~~~event body~~~~", eventBody);


  if (eventBody.firstName && eventBody.lastName && eventBody.email && eventBody.password) {
    console.log("~~~inside 1~~~~");
    return await signupHandler(eventBody);
  } else if (eventBody.email && eventBody.password) {
    console.log("~~~inside 2~~~~");
    return await signinHandler(eventBody);
  } else if (
    eventBody.tableNumber &&
    eventBody.clientName &&
    eventBody.phoneNumber &&
    eventBody.date &&
    eventBody.slotTimeStart &&
    eventBody.slotTimeEnd
  ) {
    console.log("~~~inside 3~~~~");
    return await createReservationHandler(eventBody);
  } else if (path === "/tables" && httpMethod === "GET") {
    console.log("~~~inside 4~~~~");
    return await getTablesHandler(eventBody);
  } else if (path=== "/tables" && httpMethod === "POST") {
    console.log("~~~inside 5~~~~");
    return await createTableHandler(eventBody);
  } else if (
    path &&
    path.startsWith("/tables/") &&
    event.method === "GET"
  ) {
    console.log("~~~inside 6~~~~");
    return await getTableByIdHandler(eventBody);
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

// /signup POST
const signupHandler = async (event) => {
  const { firstName, lastName, email, password } = event;

  const params = {
    UserPoolId: userPoolId,
    Username: email,
    UserAttributes: [
      { Name: "given_name", Value: firstName },
      { Name: "family_name", Value: lastName },
      { Name: "email", Value: email },
    ],
    MessageAction: "SUPPRESS",
    TemporaryPassword: password,
  };

  console.log("~~~signup params~~~~", params);

  try {
    await cognito.adminCreateUser(params).promise();
    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Sign-up process is successful" }),
    };
  } catch (error) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: error.message }),
    };
  }
};

// /signin POST
const signinHandler = async (event) => {
  const { email, password } = event;

  const params = {
    AuthFlow: "USER_PASSWORD_AUTH",
    AuthParameters: {
      ClientId:uuidv4(),
      USERNAME: email,
      PASSWORD: password,
    },
  };
  console.log("~~~signin params~~~~", params);

  try {
    const response = await cognito.initiateAuth(params).promise();
    return {
      statusCode: 200,
      body: JSON.stringify({
        accessToken: response.AuthenticationResult.IdToken,
      }),
    };
  } catch (error) {
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
  console.log("~~~tables get params~~~~", params);

  try {
    const data = await dynamoDb.scan(params).promise();
    return {
      statusCode: 200,
      body: JSON.stringify({ tables: data.Items }),
    };
  } catch (error) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: error.message }),
    };
  }
};

// /tables POST
const createTableHandler = async (event) => {
  const { id, number, places, isVip, minOrder } = event;
  const params = {
    TableName: T_tables,
    Item: {
      id: id || uuidv4(),
      number,
      places,
      isVip,
      minOrder,
    },
  };
  console.log("~~~tables post params~~~~", params);

  try {
    await dynamoDb.put(params).promise();
    return {
      statusCode: 200,
      body: JSON.stringify({ id: params.Item.id }),
    };
  } catch (error) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: error.message }),
    };
  }
};

// /tables/{tableId} GET
const getTableByIdHandler = async (event) => {
  const tableId = event.resource.split("/")[2];
  const params = {
    TableName: T_tables,
    Key: {
      id: tableId,
    },
  };
  console.log("~~~tables id params~~~~", params);

  try {
    const data = await dynamoDb.get(params).promise();
    return {
      statusCode: 200,
      body: JSON.stringify(data.Item),
    };
  } catch (error) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: error.message }),
    };
  }
};

// /reservations POST
const createReservationHandler = async (event) => {
  const {
    tableNumber,
    clientName,
    phoneNumber,
    date,
    slotTimeStart,
    slotTimeEnd,
  } = event;
  const params = {
    TableName: T_reservations,
    Item: {
      reservationId: uuidv4(),
      tableNumber,
      clientName,
      phoneNumber,
      date,
      slotTimeStart,
      slotTimeEnd,
    },
  };
  console.log("~~~reservations post params~~~~", params);

  try {
    await dynamoDb.put(params).promise();
    return {
      statusCode: 200,
      body: JSON.stringify({ reservationId: params.Item.reservationId }),
    };
  } catch (error) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: error.message }),
    };
  }
};

// /reservations GET
const getReservationsHandler = async (event) => {
  const params = {
    TableName: T_reservations,
  };
  console.log("~~~reservations get params~~~~", params);

  try {
    const data = await dynamoDb.scan(params).promise();
    return {
      statusCode: 200,
      body: JSON.stringify({ reservations: data.Items }),
    };
  } catch (error) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: error.message }),
    };
  }
};
