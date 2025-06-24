# OpenGTINDB Adapter

Connects to the OpenGTINDB API to find products for an EAN Code

## Config

```json
{
  "services": [
    {
      ...
      "source": {
        "adapterName": "opengtindb", // Needs to be opengtindb for this adapter to be loaded
        "userid": "opengtinUserId" // Put your OpenGTINDB userId here
      },
    }
  ]
}
```

### OpenGTINDB User ID

Read [this documentation](https://opengtindb.org/userid.php) to learn how to get your OpenGTINDB User ID
