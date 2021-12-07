import { expect } from 'chai';
import { Configuration } from '../configuration'
import { ContainersApi } from '../apis/containers-api'
import { DataSourcesApi } from '../apis/data-sources-api'
import { MiscApi } from '../apis/misc-api'
import { AuthenticationApi } from '../apis/authentication-api'
import { CreateContainerRequest } from '../models/create-container-request'
import { CreateDataSourceRequest } from '../models';

describe('A deep lynx sdk', async () => {
    const basePath: string = 'http://localhost:8090'
    const containerName: string = 'sdk_test'
    let containerID: string = ''
    const datasourceName: string = 'sdk_test_source'

    const apiKey = process.env.API_KEY || ''
    const apiSecret = process.env.API_SECRET || ''

    const configuration = new Configuration()
    configuration.basePath = basePath

    const containersApi = new ContainersApi(configuration)

    before(async function () {
        if (apiKey === '' || apiSecret === '') {
            console.log('skipping tests, no api key and secret provided');
            this.skip();
        }

        const miscApi = new MiscApi(configuration)
        const health = await miscApi.health().catch((r => {
            console.log('skipping tests, no connection to Deep Lynx');
            this.skip();
        }))

        if (health.data != 'OK') {
            console.log('skipping tests, no connection to Deep Lynx');
            this.skip();
        }

        // perform Oauth token retrieval
        const authenticationApi = new AuthenticationApi(configuration)
        const token = await authenticationApi.retrieveOAuthToken(apiKey, apiSecret, '1h')
        
        expect(token.data).not.null
        configuration.accessToken = token.data
    })

    after(async function () {
        if (containerID != '') {
            return await containersApi.archiveContainer(containerID, true)
        } else {
            return true
        }
    })

    it('can create a manual import', async function () {
        // create a container
        const createRequest:CreateContainerRequest = {
            name: containerName,
            description: 'Test container'
        }
        const container = await containersApi.createContainer(createRequest)

        expect(container.data.value[0].id).not.null
        containerID = container.data.value[0].id

        // create a datasource
        const datasourcesApi = new DataSourcesApi(configuration)
        const datasourceRequest:CreateDataSourceRequest = {
            name: datasourceName,
            adapterType: 'standard',
            active: true,
            config: {}
        }
        const datasource = await datasourcesApi.createDataSource(datasourceRequest, containerID)

        expect(datasource.data.value.id).not.null
        const datasourceID = datasource.data.value.id

        // create manual import
        const manualImport = await datasourcesApi.createManualImport({'test': 'data'}, containerID, datasourceID, {
            headers: { "Content-Type": "application/json" }
        })

        expect(manualImport.data.value.id).not.null
    })

})