// import AWS from "aws-sdk";
// import { v4 as uuidv4 } from "uuid";

// const cognito = new AWS.CognitoIdentityServiceProvider();
// const dynamodb = new AWS.DynamoDB.DocumentClient();

// export const handler = async (event) => {
//   console.log("~~~Event~~~", event);
//   const path = event.rawPath;
//   console.log("~~~Event path~~~", path);
//   const method = event.requestContext.http.method;
//   console.log("~~~Event method~~~", method);
//   const headers = event.headers;
//   console.log("~~~Event headers~~~", event);
//   console.log("~~~Event body~~~", event.body);
//   console.log("~~~Event body(parsed)~~~", JSON.parse(event.body));

//   try {
//     if (path === "/signup" && method === "POST") {
//       const { firstName, lastName, email, password } = JSON.parse(event.body);

//       const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
//       const passwordRegex = /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[\W_]).{8,}$/;
//       if (
//         !firstName ||
//         !lastName ||
//         !email ||
//         !password ||
//         !emailRegex.test(email) ||
//         !passwordRegex.test(password)
//       ) {
//         return {
//           statusCode: 400,
//           body: JSON.stringify({
//             message:
//               "Invalid request body, email format, or password requirements",
//           }),
//         };
//       }

//       const params = {
//         UserPoolId: process.env.booking_userpool,
//         Username: email,
//         TemporaryPassword: password,
//         UserAttributes: [
//           { Name: "email", Value: email },
//           { Name: "given_name", Value: firstName },
//           { Name: "family_name", Value: lastName },
//         ],
//         MessageAction: "SUPRESS",
//       };
//       console.log("~~~params(post/signup)~~~", params);

//       await cognito.adminCreateUser(params).promise();

//       await cognito
//         .adminSetUserPassword({
//           UserPoolId: process.env.booking_userpool,
//           Username: email,
//           Password: password,
//           Permanent: true,
//         })
//         .promise();

//       return {
//         statusCode: 200,
//         body: JSON.stringify({ message: "Signup successful" }),
//       };
//     }

//     if (path === "/signin" && method === "POST") {
//       const { email, password } = JSON.parse(event.body);

//       if (!email || !password) {
//         return {
//           statusCode: 400,
//           body: JSON.stringify({ message: "Invalid request body" }),
//         };
//       }

//       const params = {
//         AuthFlow: "USER_PASSWORD_AUTH",
//         ClientId: process.env.cognito_client_id,
//         AuthParameters: {
//           USERNAME: email,
//           PASSWORD: password,
//         },
//       };
//       console.log("~~~params(get/signin)~~~", params);

//       try {
//         const authResponse = await cognito.initiateAuth(params).promise();
//         return {
//           statusCode: 200,
//           body: JSON.stringify({
//             accessToken: authResponse.AuthenticationResult.IdToken,
//           }),
//         };
//       } catch (error) {
//         if (
//           error.code === "NotAuthorizedException" ||
//           error.code === "UserNotFoundException"
//         ) {
//           return {
//             statusCode: 400,
//             body: JSON.stringify({ message: "Invalid username or password" }),
//           };
//         }
//         throw error;
//       }
//     }

//     if (path === "/tables" && method === "GET") {
//       const token = headers.Authorization;

//       if (!token) {
//         return {
//           statusCode: 401,
//           body: JSON.stringify({ message: "Unauthorized" }),
//         };
//       }

//       const params = {
//         TableName: process.env.tables_table,
//       };

//       const result = await dynamodb.scan(params).promise();

//       return {
//         statusCode: 200,
//         body: JSON.stringify({ tables: result.Items }),
//       };
//     }

//     if (path === "/tables" && method === "POST") {
//       const token = headers.Authorization;
//       const { id, number, places, isVip, minOrder } = JSON.parse(event.body);

//       if (!token || !id || !number || !places || isVip === undefined) {
//         return {
//           statusCode: 400,
//           body: JSON.stringify({ message: "Invalid request body" }),
//         };
//       }

//       const params = {
//         TableName: process.env.tables_table,
//         Item: {
//           id,
//           number,
//           places,
//           isVip,
//           minOrder,
//         },
//       };
//       console.log("~~~params(post/tables)~~~", params);

//       await dynamodb.put(params).promise();

//       return {
//         statusCode: 200,
//         body: JSON.stringify({ id }),
//       };
//     }

//     if (path.startsWith("/tables/") && method === "GET") {
//       const token = headers.Authorization;
//       const tableId = path.split("/")[2];

//       if (!token || !tableId) {
//         return {
//           statusCode: 400,
//           body: JSON.stringify({ message: "Invalid request" }),
//         };
//       }

//       const params = {
//         TableName: process.env.tables_table,
//         Key: {
//           id: tableId,
//         },
//       };
//       console.log("~~~params(post/startswithTable)~~~", params);

//       const result = await dynamodb.get(params).promise();

//       return {
//         statusCode: 200,
//         body: JSON.stringify(result.Item),
//       };
//     }

//     if (path === "/reservations" && method === "POST") {
//       const token = headers.Authorization;
//       const {
//         tableNumber,
//         clientName,
//         phoneNumber,
//         date,
//         slotTimeStart,
//         slotTimeEnd,
//       } = JSON.parse(event.body);

//       if (
//         !token ||
//         !tableNumber ||
//         !clientName ||
//         !phoneNumber ||
//         !date ||
//         !slotTimeStart ||
//         !slotTimeEnd
//       ) {
//         return {
//           statusCode: 400,
//           body: JSON.stringify({ message: "Invalid request body" }),
//         };
//       }

//       const reservationId = uuidv4();

//       const params = {
//         TableName: process.env.reservations_table,
//         Item: {
//           id: reservationId,
//           tableNumber,
//           clientName,
//           phoneNumber,
//           date,
//           slotTimeStart,
//           slotTimeEnd,
//         },
//       };
//       console.log("~~~params(post/reservations)~~~", params);

//       await dynamodb.put(params).promise();

//       return {
//         statusCode: 200,
//         body: JSON.stringify({ reservationId }),
//       };
//     }

//     if (path === "/reservations" && method === "GET") {
//       const token = headers.Authorization;

//       if (!token) {
//         return {
//           statusCode: 401,
//           body: JSON.stringify({ message: "Unauthorized" }),
//         };
//       }

//       const params = {
//         TableName: process.env.reservations_table,
//       };

//       const result = await dynamodb.scan(params).promise();

//       return {
//         statusCode: 200,
//         body: JSON.stringify({ reservations: result.Items }),
//       };
//     }

//     return {
//       statusCode: 404,
//       body: JSON.stringify({ message: "Not Found" }),
//     };
//   } catch (error) {
//     console.error("Error:", error);
//     return {
//       statusCode: 500,
//       body: JSON.stringify({ message: "Internal Server Error" }),
//     };
//   }
// };

// import AWS from 'aws-sdk';
// import { v4 as uuidv4 } from 'uuid';

// const cognito = new AWS.CognitoIdentityServiceProvider();

// export const handler = async (event) => {
//   try {
//     // Check if event contains the signup details directly
//     if (event.firstName && event.lastName && event.email && event.password) {
//       const { firstName, lastName, email, password } = event;

//       // Email validation
//       const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

//       // Password validation
//       const passwordRegex = /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[\W_]).{8,}$/;

//       if (!emailRegex.test(email) || !passwordRegex.test(password)) {
//         return {
//           statusCode: 400,
//           body: JSON.stringify({
//             message: 'Invalid email format or password requirements not met',
//           }),
//         };
//       }

//       const params = {
//         UserPoolId: process.env.booking_userpool,
//         Username: email,
//         TemporaryPassword: password,
//         UserAttributes: [
//           { Name: 'email', Value: email },
//           { Name: 'given_name', Value: firstName },
//           { Name: 'family_name', Value: lastName },
//         ],
//         MessageAction: 'SUPPRESS',
//       };

//       await cognito.adminCreateUser(params).promise();

//       await cognito
//         .adminSetUserPassword({
//           UserPoolId: process.env.booking_userpool,
//           Username: email,
//           Password: password,
//           Permanent: true,
//         })
//         .promise();

//       return {
//         statusCode: 200,
//         body: JSON.stringify({ message: 'Signup successful' }),
//       };
//     } else {
//       return {
//         statusCode: 400,
//         body: JSON.stringify({ message: 'Missing required fields' }),
//       };
//     }
//   } catch (error) {
//     console.error('Error:', error);

//     return {
//       statusCode: 500,
//       body: JSON.stringify({ message: 'Internal Server Error', error: error.message }),
//     };
//   }
// };


import AWS from "aws-sdk";
import { v4 as uuidv4 } from "uuid";

const cognito = new AWS.CognitoIdentityServiceProvider();
const dynamoDb = new AWS.DynamoDB.DocumentClient();

const T_tables = process.env.tables_table || "Tables";
const T_reservations = process.env.reservations_table || "Reservations";
const userPoolId = process.env.booking_userpool || "simple-booking-userpool";

export const handler = async (event) => {
  if (event.firstName && event.lastName && event.email && event.password) {
    return await signupHandler(event);
  } else if (event.email && event.password) {
    return await signinHandler(event);
  } else if (event.tableNumber && event.clientName && event.phoneNumber && event.date && event.slotTimeStart && event.slotTimeEnd) {
    return await createReservationHandler(event);
  } else if (event.resource === "/tables" && event.method === "GET") {
    return await getTablesHandler(event);
  } else if (event.resource === "/tables" && event.method === "POST") {
    return await createTableHandler(event);
  } else if (event.resource && event.resource.startsWith("/tables/") && event.method === "GET") {
    return await getTableByIdHandler(event);
  } else if (event.resource === "/reservations" && event.method === "GET") {
    return await getReservationsHandler(event);
  } else {
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
    MessageAction: "SUPPRESS", // To suppress sending the welcome email
    TemporaryPassword: password,
  };

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
      USERNAME: email,
      PASSWORD: password,
    },
  };

  try {
    const response = await cognito.initiateAuth(params).promise();
    return {
      statusCode: 200,
      body: JSON.stringify({ accessToken: response.AuthenticationResult.IdToken }),
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
  const { tableNumber, clientName, phoneNumber, date, slotTimeStart, slotTimeEnd } = event;
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
