import AWS from "aws-sdk";
import { v4 as uuidv4 } from "uuid";

const cognito = new AWS.CognitoIdentityServiceProvider();
const dynamoDb = new AWS.DynamoDB.DocumentClient();

const T_tables = process.env.tables_table || "Tables000";
console.log("~~~T_tables~~~~", T_tables);
const T_reservations = process.env.reservations_table || "Reservations000";
console.log("~~~T_reservations~~~~", T_reservations);
const userPoolName = process.env.booking_userpool || "simple-booking-userpool000";
console.log("~~~user_pool_id~~~~", userPoolName);
let userPoolID;
// const clientId = process.env.booking_client_id || "your-client-id000";
// console.log("~~~clientID~~~~", clientId);

export const handler = async (event) => {
  console.log("~~~EVENT~~~~", event);

  const httpMethod = event.httpMethod;
  console.log("~~~httpMethod~~~~", httpMethod);

  const path = event.path;
  console.log("~~~path~~~~", path);

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
    return await createReservationHandler(eventBody);
  } else if (path === "/tables" && httpMethod === "GET") {
    console.log("~~~inside 4~~~~");
    return await getTablesHandler(eventBody);
  } else if (path === "/tables" && httpMethod === "POST") {
    console.log("~~~inside 5~~~~");
    return await createTableHandler(eventBody);
  } else if (path && path.startsWith("/tables/") && httpMethod === "GET") {
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

const getuserPoolNameByName = async (userPoolName) => {
  try {
    const params = {
      MaxResults: 60,
    };
    const response = await cognito.listUserPools(params).promise();
    console.log("~~~Response from getuserPoolNamebyName",response);

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

// /signup POST
const signupHandler = async (event) => {
  console.log("We are in signupHandler, event is - ", event);
  const eventObj = JSON.parse(event);
  console.log("We are in signupHandler, event obj(parsed) - ", eventObj);
  console.log(
    "We are in signupHandler, event obj(parsed) type is - ",
    typeof eventObj
  );

  if (!userPoolID) {
    userPoolID = await getuserPoolNameByName(userPoolName);
  }

  const params = {
    userPoolId: userPoolID,
    Username: eventObj.email,
    UserAttributes: [
      { Name: "custom:firstName", Value: eventObj.firstName },
      { Name: "custom:lastName", Value: eventObj.lastName },
      { Name: "email", Value: eventObj.email },
    ],
    MessageAction: "SUPPRESS",
    TemporaryPassword: eventObj.password,
  };

  console.log("~~~signup params~~~~", params);

  try {
    console.log("We are in try block(signupHandler)");
    const req = await cognito.adminCreateUser(params).promise();
    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Sign-up process is successful" }),
    };
  } catch (error) {
    console.log("We are in catch block(signupHandler)",error.message);
    return {
      statusCode: 400,
      body: JSON.stringify({ message: error.message }),
    };
  }
};

// /signin POST
const signinHandler = async (event) => {
  console.log("We in signinHandler, event is - ", event);
  const eventObj = JSON.parse(event);

  const params = {
    // AuthFlow: "USER_PASSWORD_AUTH",
    AuthFlow: "ADMIN_NO_SRP_AUTH",
    // ClientId: clientId,
    ClientId: "4qsja8sien9cv8fpgtidukrh7p",
    AuthParameters: {
      USERNAME: eventObj.email,
      PASSWORD: eventObj.password,
    },
  };
  console.log("~~~signin params~~~~", params);

  try {
    console.log("We are in try block(signinHandler)");

    const response = await cognito.initiateAuth(params).promise();
    const idToken = response.AuthenticationResult.IdToken;
    return idToken;
    // return {
    //   statusCode: 200,
    //   body: JSON.stringify({
    //     accessToken: response.AuthenticationResult.IdToken,
    //   }),
    // };
  } catch (error) {
    console.log("We are in try block(signinHandler)");

    return {
      statusCode: 400,
      body: JSON.stringify({ message: error.message }),
    };
  }
};

// /tables GET
const getTablesHandler = async (event) => {
  console.log("We in getTablesHandler, event is - ", event);

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
  console.log("We are in createTableHandler, event is - ", event);
  const eventObj = JSON.parse(event);

  const params = {
    TableName: T_tables,
    Item: {
      id: eventObj.id || uuidv4(),
      number: eventObj.number,
      places: eventObj.places,
      isVip: eventObj.isVip,
      minOrder: eventObj.minOrder,
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
  console.log("We in getTableByIdHandler, event is - ", event);
  const eventObj = JSON.parse(event);

  const tableId = eventObj.resource.split("/")[2];
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
  console.log("We in createReservationHandler, event is - ", event);
  const eventObj = JSON.parse(event);

  const params = {
    TableName: T_reservations,
    Item: {
      reservationId: uuidv4(),
      tableNumber: eventObj.tableNumber,
      clientName: eventObj.clientName,
      phoneNumber: eventObj.phoneNumber,
      date: eventObj.date,
      slotTimeStart: eventObj.slotTimeStart,
      slotTimeEnd: eventObj.slotTimeEnd,
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
  console.log("We in getReservationsHandler, event is - ", event);

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

// {
//   resource: '/signup',
//   path: '/signup',
//   httpMethod: 'POST',
//   headers: {
//     Accept: '*/*',
//     'Accept-Encoding': 'gzip, deflate',
//     'CloudFront-Forwarded-Proto': 'https',
//     'CloudFront-Is-Desktop-Viewer': 'true',
//     'CloudFront-Is-Mobile-Viewer': 'false',
//     'CloudFront-Is-SmartTV-Viewer': 'false',
//     'CloudFront-Is-Tablet-Viewer': 'false',
//     'CloudFront-Viewer-ASN': '16509',
//     'CloudFront-Viewer-Country': 'DE',
//     'Content-Type': 'application/json',
//     Host: 'ynv7d7gjv3.execute-api.eu-central-1.amazonaws.com',
//     'User-Agent': 'python-requests/2.31.0',
//     Via: '1.1 55107fc1be09ed1afcf3154ed9bd93cc.cloudfront.net (CloudFront)',
//     'X-Amz-Cf-Id': 'pP-AqA2pU4QIvFrFiNtijKSgwkQdVxjsXFo69nHzUAy5imUHQXxycA==',
//     'X-Amzn-Trace-Id': 'Root=1-66be0090-76ea0d1b026f0e9121206e9b',
//     'X-Forwarded-For': '18.153.146.156, 130.176.223.103',
//     'X-Forwarded-Port': '443',
//     'X-Forwarded-Proto': 'https'
//   },
//   multiValueHeaders: {
//     Accept: [ '*/*' ],
//     'Accept-Encoding': [ 'gzip, deflate' ],
//     'CloudFront-Forwarded-Proto': [ 'https' ],
//     'CloudFront-Is-Desktop-Viewer': [ 'true' ],
//     'CloudFront-Is-Mobile-Viewer': [ 'false' ],
//     'CloudFront-Is-SmartTV-Viewer': [ 'false' ],
//     'CloudFront-Is-Tablet-Viewer': [ 'false' ],
//     'CloudFront-Viewer-ASN': [ '16509' ],
//     'CloudFront-Viewer-Country': [ 'DE' ],
//     'Content-Type': [ 'application/json' ],
//     Host: [ 'ynv7d7gjv3.execute-api.eu-central-1.amazonaws.com' ],
//     'User-Agent': [ 'python-requests/2.31.0' ],
//     Via: [
//       '1.1 55107fc1be09ed1afcf3154ed9bd93cc.cloudfront.net (CloudFront)'
//     ],
//     'X-Amz-Cf-Id': [ 'pP-AqA2pU4QIvFrFiNtijKSgwkQdVxjsXFo69nHzUAy5imUHQXxycA==' ],
//     'X-Amzn-Trace-Id': [ 'Root=1-66be0090-76ea0d1b026f0e9121206e9b' ],
//     'X-Forwarded-For': [ '18.153.146.156, 130.176.223.103' ],
//     'X-Forwarded-Port': [ '443' ],
//     'X-Forwarded-Proto': [ 'https' ]
//   },
//   queryStringParameters: null,
//   multiValueQueryStringParameters: null,
//   pathParameters: null,
//   stageVariables: null,
//   requestContext: {
//     resourceId: 'fd88ff',
//     resourcePath: '/signup',
//     httpMethod: 'POST',
//     extendedRequestId: 'cjUGoFUpliAETjw=',
//     requestTime: '15/Aug/2024:13:20:16 +0000',
//     path: '/api/signup',
//     accountId: '196241772369',
//     protocol: 'HTTP/1.1',
//     stage: 'api',
//     domainPrefix: 'ynv7d7gjv3',
//     requestTimeEpoch: 1723728016551,
//     requestId: 'e6caac0c-58eb-4536-8e28-aacacde095be',
//     identity: {
//       cognitoIdentityPoolId: null,
//       accountId: null,
//       cognitoIdentityId: null,
//       caller: null,
//       sourceIp: '18.153.146.156',
//       principalOrgId: null,
//       accessKey: null,
//       cognitoAuthenticationType: null,
//       cognitoAuthenticationProvider: null,
//       userArn: null,
//       userAgent: 'python-requests/2.31.0',
//       user: null
//     },
//     domainName: 'ynv7d7gjv3.execute-api.eu-central-1.amazonaws.com',
//     deploymentId: '78wk2z',
//     apiId: 'ynv7d7gjv3'
//   },
//   body: '{"firstName": "cmtr-954a4fcc-User", "lastName": "cmtr-954a4fcc-Validation", "email": "cmtr-954a4fcc-validation_user@test.com", "password": "p12345T-048_Gru"}',
//   isBase64Encoded: false
// }
