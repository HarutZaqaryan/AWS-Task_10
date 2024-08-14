import AWS from 'aws-sdk';
import { v4 as uuidv4 } from 'uuid';

const cognito = new AWS.CognitoIdentityServiceProvider();
const dynamodb = new AWS.DynamoDB.DocumentClient();

export const handler = async (event) => {
    const path = event.rawPath;
    const method = event.requestContext.http.method;
    const headers = event.headers;

    try {
        if (path === '/signup' && method === 'POST') {
            const { firstName, lastName, email, password } = JSON.parse(event.body);

            if (!firstName || !lastName || !email || !password) {
                return {
                    statusCode: 400,
                    body: JSON.stringify({ message: 'Invalid request body' }),
                };
            }

            const params = {
                UserPoolId: process.env.booking_userpool,
                Username: email,
                TemporaryPassword: password,
                UserAttributes: [
                    { Name: 'email', Value: email },
                    { Name: 'given_name', Value: firstName },
                    { Name: 'family_name', Value: lastName },
                ],
            };

            await cognito.adminCreateUser(params).promise();

            return {
                statusCode: 200,
                body: JSON.stringify({ message: 'Signup successful' }),
            };
        }

        if (path === '/signin' && method === 'POST') {
            const { email, password } = JSON.parse(event.body);

            if (!email || !password) {
                return {
                    statusCode: 400,
                    body: JSON.stringify({ message: 'Invalid request body' }),
                };
            }

            const params = {
                AuthFlow: 'USER_PASSWORD_AUTH',
                ClientId: process.env.cognito_client_id,
                AuthParameters: {
                    USERNAME: email,
                    PASSWORD: password,
                },
            };

            const authResponse = await cognito.initiateAuth(params).promise();

            return {
                statusCode: 200,
                body: JSON.stringify({ accessToken: authResponse.AuthenticationResult.IdToken }),
            };
        }

        if (path === '/tables' && method === 'GET') {
            const token = headers.Authorization;

            if (!token) {
                return {
                    statusCode: 401,
                    body: JSON.stringify({ message: 'Unauthorized' }),
                };
            }

            const params = {
                TableName: process.env.tables_table,
            };

            const result = await dynamodb.scan(params).promise();

            return {
                statusCode: 200,
                body: JSON.stringify({ tables: result.Items }),
            };
        }

        if (path === '/tables' && method === 'POST') {
            const token = headers.Authorization;
            const { id, number, places, isVip, minOrder } = JSON.parse(event.body);

            if (!token || !id || !number || !places || isVip === undefined) {
                return {
                    statusCode: 400,
                    body: JSON.stringify({ message: 'Invalid request body' }),
                };
            }

            const params = {
                TableName: process.env.tables_table,
                Item: {
                    id,
                    number,
                    places,
                    isVip,
                    minOrder,
                },
            };

            await dynamodb.put(params).promise();

            return {
                statusCode: 200,
                body: JSON.stringify({ id }),
            };
        }

        if (path.startsWith('/tables/') && method === 'GET') {
            const token = headers.Authorization;
            const tableId = path.split('/')[2];

            if (!token || !tableId) {
                return {
                    statusCode: 400,
                    body: JSON.stringify({ message: 'Invalid request' }),
                };
            }

            const params = {
                TableName: process.env.tables_table,
                Key: {
                    id: tableId,
                },
            };

            const result = await dynamodb.get(params).promise();

            return {
                statusCode: 200,
                body: JSON.stringify(result.Item),
            };
        }

        if (path === '/reservations' && method === 'POST') {
            const token = headers.Authorization;
            const { tableNumber, clientName, phoneNumber, date, slotTimeStart, slotTimeEnd } = JSON.parse(event.body);

            if (!token || !tableNumber || !clientName || !phoneNumber || !date || !slotTimeStart || !slotTimeEnd) {
                return {
                    statusCode: 400,
                    body: JSON.stringify({ message: 'Invalid request body' }),
                };
            }

            const reservationId = uuidv4();

            const params = {
                TableName: process.env.reservations_table,
                Item: {
                    id: reservationId,
                    tableNumber,
                    clientName,
                    phoneNumber,
                    date,
                    slotTimeStart,
                    slotTimeEnd,
                },
            };

            await dynamodb.put(params).promise();

            return {
                statusCode: 200,
                body: JSON.stringify({ reservationId }),
            };
        }

        if (path === '/reservations' && method === 'GET') {
            const token = headers.Authorization;

            if (!token) {
                return {
                    statusCode: 401,
                    body: JSON.stringify({ message: 'Unauthorized' }),
                };
            }

            const params = {
                TableName: process.env.reservations_table,
            };

            const result = await dynamodb.scan(params).promise();

            return {
                statusCode: 200,
                body: JSON.stringify({ reservations: result.Items }),
            };
        }

        return {
            statusCode: 404,
            body: JSON.stringify({ message: 'Not Found' }),
        };

    } catch (error) {
        console.error('Error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Internal Server Error' }),
        };
    }
};
