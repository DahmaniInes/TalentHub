// nomenclature-service/.../Security/RequiresPermission.java
package com.talenthub.nomenclature_service.Security;

import java.lang.annotation.*;

@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
@Documented
public @interface RequiresPermission {
    String[] value();
}