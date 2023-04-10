# Operations Log

The operations log or oplog, contains an immutable list of operations which have been carried out on the database.

Each operation is known as an entry and each entry includes the id of the log the entry is stored in, some metadata describing the entry, references to other entries which come before it and payload which includes the data being stored as well as an operation, which describes the type of record being stored.

## Operations

Operations are of either type "PUT" or "DEL". 

A PUT operation describes a record which has been created or edited. If operations share the same key or id, they are assumed to be related and the operation which was created after all other operations with the same key will be the latest version of the record.

A DEL operation describes a record which has been removed. It will share the same key as a previous PUT operation and will indicate that the record that was PUT is now deleted.

A PUT record might look like:

```
{
  id: 'log-1',
  payload: { op: 'PUT', key: 4, value: 'Some data' },
  next: [ '3' ],
  refs: [
    '2',
    '1'
  ],
  clock: Clock {
    id: '038cc50a92f10c39f74394a1779dffb2c79ddc6b7d1bbef8c484bd4bbf8330c426',
    time: 4
  },
  v: 2
}
```

In the above example, payload holds the information about the record. `op` is the operation carried out, in this case PUT (the other option is DEL). `key` holds a unique identifier for the record and value contains some data. In the above example, data is a string but it could be a number, XML or even the JSON representation of an object.

### Joining Logs

Logs are stored independently of one another, hence they are decentralized. If two logs store the data for the same database, they must eventually be joined together.

Each log contains one or more entries. The latest entry in the log is known as the head. When one log is merged into another log ("log joining"), the head of each log is referenced, resulting in a log having multiple heads.   

### An example

Two logs, A and B, store entries for some database, "my-db". A resides on one computer, and B on another.

Entries are added to log A:

```
logA.append('A1')
logA.append('A2')
logA.append('A3')
```

Graphically, this can be represented as:

![A-Chain](./images/A-chain.png)

Each circle is a new log entry and the vertical line "T" represents the time the entry is added. "A3" represents log A's head entry.

Adding entries to log B:

```
logB.append('B1')
logB.append('B2')
```

Again, graphically, this may look something like:

![B-Chain](./images/B-chain.png)

For log B, head is "B2".

Both logs A and B are managed separately but, because they both store entries for database my-db, at some point they need to merged. Logs are merged using the `join` function. To merge logA into logB, the `join` function is called on logB:

```
logB.join(logA)
```

On B, two parallel log histories are stored:

![Join A to B](./images/join-A-to-B.png)

Note that log B now has two heads, "A3" and "B2".

Also note that log A remains unchanged. This is because logB has not been merged into logA:

![A-Chain unchanged](./images/A-chain.png)

Adding a new record results in log B having a single head, B3:

```
logB.join('B3')
```

![Add new item to B after B.join(A)](./images/join-A-to-B-add-to-B.png)

Log A remains unchanged.

Merging B into A is the same as merging A into B:

```
logA.join(logB)
```

Calling join on logA results in the following:

![Join B to A](./images/join-B-to-A.png)

Log A's heads are "A3" and "B3".

Finally, adding a new record to A:

```
logA.append('A4')
```

results in:

![Add new item to A after A.join(B)](./images/join-B-to-A-add-to-A.png)

with log A's single head referencing "A4".