import sys
import pkg_resources

def check_dependencies():
    required_packages = {
        'google-meridian': None,
        'jax': None,
        'jaxlib': None,
        'arviz': None,
        'tensorflow': None,
        'tensorflow-probability': None
    }
    
    print("=== Diagnóstico de Dependências MMM ===")
    
    installed_packages = {pkg.key: pkg.version for pkg in pkg_resources.working_set}
    
    mismatches = []
    
    for pkg, required_version in required_packages.items():
        if pkg in installed_packages:
            print(f"[OK] {pkg} instalado: versão {installed_packages[pkg]}")
        else:
            print(f"[ERRO] {pkg} NÃO ENCONTRADO")
            mismatches.append(f"{pkg} (missing)")
            
    if mismatches:
        print("\n=> RESULTADO: Inconsistências encontradas que podem quebrar o backend do Meridian!")
        print("Problemas:", ", ".join(mismatches))
        sys.exit(1)
    else:
        print("\n=> RESULTADO: Todas as dependências principais estão instaladas corretamente.")
        sys.exit(0)

if __name__ == '__main__':
    check_dependencies()
