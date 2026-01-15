# JSON to Object Converter

A VSCode extension that converts JSON to type definitions for various programming languages.

## Demo

![practice 1](https://raw.githubusercontent.com/HyunsooZo/ninja-extentions/main/json-to-object/images/practice1.gif)
![practice 2](https://raw.githubusercontent.com/HyunsooZo/ninja-extentions/main/json-to-object/images/practice2.gif)
![practice 3](https://raw.githubusercontent.com/HyunsooZo/ninja-extentions/main/json-to-object/images/practice3.gif)

## Supported Languages

- **TypeScript** - Interface
- **JavaScript** - JSDoc + Class
- **Python** - Dataclass
- **Java** - Class with Getters/Setters
- **Kotlin** - Data Class
- **Go** - Struct with JSON tags
- **Rust** - Struct with Serde
- **C** - Typedef Struct
- **C++** - Class

## Features

- Automatic nested object handling (generates separate classes/structs)
- Array element type inference
- Language-specific naming conventions (PascalCase, snake_case, etc.)
- **Output Mode**: Single file or multiple tabs (per type)
- **Java Options**:
  - Class or Record (Java 14+)
  - Lombok support (@Data, @Getter/@Setter)
  - Constructor generation (NoArgs + AllArgs)
  - Getter/Setter methods
  - Inner class or separate classes
- **Java/Kotlin**: @JsonProperty annotation support

## Usage

1. Select JSON text in your editor
2. Right-click → **"Convert JSON to Object"** (or `Cmd+Shift+P` → "Convert JSON to Object")
3. Choose your target language
4. Enter the type/class name
5. Select output mode (single file or multiple tabs)
6. Configure language-specific options (if applicable)
7. Generated code opens in new tab(s)

## Examples

### Input JSON
```json
{
  "name": "John Doe",
  "age": 30,
  "email": "john@example.com",
  "isActive": true,
  "tags": ["developer", "designer"],
  "address": {
    "city": "Seoul",
    "zipCode": "12345"
  }
}
```

### TypeScript Output
```typescript
interface Address {
  city: string;
  zipCode: string;
}

interface User {
  name: string;
  age: number;
  email: string;
  isActive: boolean;
  tags: string[];
  address: Address;
}
```

### Python Output
```python
from dataclasses import dataclass
from typing import Any

@dataclass
class Address:
    city: str
    zip_code: str

@dataclass
class User:
    name: str
    age: int
    email: str
    is_active: bool
    tags: list[str]
    address: Address
```

### Java Output
```java
import java.util.List;

public class User {
    private String name;
    private Integer age;
    private String email;
    private Boolean isActive;
    private List<String> tags;
    private Address address;

    // getters and setters...

    public static class Address {
        private String city;
        private String zipCode;
        // getters and setters...
    }
}
```

### Go Output
```go
type Address struct {
	City    string `json:"city"`
	ZipCode string `json:"zipCode"`
}

type User struct {
	Name     string   `json:"name"`
	Age      int64    `json:"age"`
	Email    string   `json:"email"`
	IsActive bool     `json:"isActive"`
	Tags     []string `json:"tags"`
	Address  Address  `json:"address"`
}
```

### Rust Output
```rust
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct Address {
    pub city: String,
    #[serde(rename = "zipCode")]
    pub zip_code: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct User {
    pub name: String,
    pub age: i64,
    pub email: String,
    #[serde(rename = "isActive")]
    pub is_active: bool,
    pub tags: Vec<String>,
    pub address: Address,
}
```

## Installation

### From Marketplace
Search for **"Json to Objects (9 languages)"** in VSCode Extensions.

### Local Development
```bash
# Install dependencies
npm install

# Test locally (F5 in VSCode)
# Or package and install:
npm install -g @vscode/vsce
vsce package
code --install-extension json-to-object-1.0.0.vsix
```

## License

MIT
