THE GOAL

We want to place each device into a left-to-right column, based ONLY on how they depend on each other.

Example:
PLCs => message-server => kafka/config => cribl => dgn => clients

STEP 1: Build the connection map

We turn your JSON links into a big map like:

plc-1-c => message-server
message-server => kafka
kafka => config-server
config-server => cribl
cribl => dgn

This gives us:
who links to whom
who depends on whom

STEP 2: Group devices that form cycles

Some devices depend on each other in loops:

cribl => dgn
dgn => cribl

OR

kafka <=> config-server

These are called SCCs, but you don’t need the word.

Just think:
“Anything that loops back on each other gets grouped.”

We treat them as one unit for ordering.
This turns your messy graph into a clean one:

[PLCs] => [message-server] => [kafka/config] => [cribl] => [dgn] => [clients]

No more loops.

This is now a DAG (a graph with no cycles), which is easy to layer.

STEP 3: Compute base column numbers (left to right)

Now we walk the graph from roots:
Roots are devices with no incoming edges
(PLCs, gpc, stamp, etc.)

They all start at column 0.

Then:
Each device goes one column to the right of its deepest parent.

Example:

PLCs => col 0
message-server => col 1
kafka/config => col 2
cribl => col 3
dgn => col 4
client => col 5

This is the natural flow.

STEP 4: Handle terminal end-of-pipeline devices

Some devices have no outgoing links:

message-client
trackmap-client
config-client
system-map-client
dgn
log-server
trackmap-server

These are sinks.
We push all sinks to the final column.

Why?
Because nothing depends on them.

STEP 5: Handle Cribl specially (but structurally)

Cribl is not a sink because it has a child (dgn).
But its child is a terminal.

So structurally:
cribl goes one column before the terminal column

Example:
dgn => last column (5)
cribl => last - 1 (4)

This reflects the real pipeline:
cribl => dgn => clients

STEP 6: Expand SCCs back to device IDs

Because we grouped cycles together earlier, we now “unpack” them and assign each device its SCC’s column.

Example:
If kafka and config-server are in the same SCC:
SCC(kafka, config-server) => column 2

Then:
kafka => column 2
config-server => column 2

RESULT
A clean, correct, fully structural column layout.
Zero ID checks.
Zero hard-coded columns.
Zero arbitrary tweaks.

Just relationship-driven logic.

SIMPLE SUMMARY
Here’s the whole algorithm in four sentences:
Find the devices with no inputs — they start in column 0.
Move each device one column to the right of the deepest device that links into it.
If devices loop into each other, group them together so they share a column.
Push all end-of-line devices (clients, dgn) to the final column, and put cribl one column before them.